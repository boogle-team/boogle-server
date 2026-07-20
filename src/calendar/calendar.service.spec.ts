import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: {
    boogleRecord: { findMany: jest.Mock };
    lifeRecord: { findMany: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      boogleRecord: { findMany: jest.fn() },
      lifeRecord: { findMany: jest.fn(), findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyCalendar', () => {
    it('30일짜리 달에 30개의 날짜를 반환한다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([]);
      prisma.lifeRecord.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyCalendar('1', 2026, 6);

      expect(result.days).toHaveLength(30);
      expect(result.days[0].date).toBe('2026-06-01');
      expect(result.days[29].date).toBe('2026-06-30');
      expect(result.days.every((d) => d.boogleStatus === 'NONE')).toBe(true);
      expect(result.summary.recordedDays).toBe(0);
      expect(result.summary.unrecordedDays).toBe(30);
    });

    it('같은 날 배변 없음→있음 기록이면 BOWEL이 우선한다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([
        {
          regDate: new Date('2026-06-05T08:00:00.000+09:00'),
          hasBowel: false,
          stoolSimple: null,
        },
        {
          regDate: new Date('2026-06-05T17:00:00.000+09:00'),
          hasBowel: true,
          stoolSimple: 'M',
        },
      ]);
      prisma.lifeRecord.findMany.mockResolvedValue([
        { regDate: new Date('2026-06-05T09:00:00.000+09:00') },
      ]);

      const result = await service.getMonthlyCalendar('1', 2026, 6);
      const day5 = result.days.find((d) => d.date === '2026-06-05');

      expect(day5?.boogleStatus).toBe('BOWEL');
      expect(day5?.stoolSimple).toBe('M');
      expect(day5?.hasLifeRecord).toBe(true);
    });

    it('배변 없음만 기록된 날은 NO_BOWEL이다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([
        {
          regDate: new Date('2026-06-02T08:00:00.000+09:00'),
          hasBowel: false,
          stoolSimple: null,
        },
      ]);
      prisma.lifeRecord.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyCalendar('1', 2026, 6);
      const day2 = result.days.find((d) => d.date === '2026-06-02');

      expect(day2?.boogleStatus).toBe('NO_BOWEL');
      expect(result.summary.noBowelDays).toBe(1);
      expect(result.summary.recordedDays).toBe(1);
    });

    it('변 상태 분포 percent를 계산한다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([
        {
          regDate: new Date('2026-06-01T08:00:00.000+09:00'),
          hasBowel: true,
          stoolSimple: 'H',
        },
        {
          regDate: new Date('2026-06-02T08:00:00.000+09:00'),
          hasBowel: true,
          stoolSimple: 'M',
        },
        {
          regDate: new Date('2026-06-03T08:00:00.000+09:00'),
          hasBowel: true,
          stoolSimple: 'M',
        },
      ]);
      prisma.lifeRecord.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyCalendar('1', 2026, 6);

      expect(result.summary.stoolDistribution.hard).toEqual({
        count: 1,
        percent: 33,
      });
      expect(result.summary.stoolDistribution.normal).toEqual({
        count: 2,
        percent: 67,
      });
      expect(result.summary.stoolDistribution.loose).toEqual({
        count: 0,
        percent: 0,
      });
    });

    it('KST 자정 근처(0~9시) 기록도 올바른 날짜로 집계된다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([
        {
          // UTC로는 5/31 15:30이지만 KST로는 6/1 00:30 — 6월 1일 기록이어야 한다.
          regDate: new Date('2026-06-01T00:30:00.000+09:00'),
          hasBowel: true,
          stoolSimple: 'M',
        },
      ]);
      prisma.lifeRecord.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyCalendar('1', 2026, 6);
      const day1 = result.days.find((d) => d.date === '2026-06-01');

      expect(day1?.boogleStatus).toBe('BOWEL');
    });
  });

  describe('getDailyRecords', () => {
    it('기록이 없으면 boogleRecords는 빈 배열, lifeRecord는 null이다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([]);
      prisma.lifeRecord.findFirst.mockResolvedValue(null);

      const result = await service.getDailyRecords('1', '2026-06-17');

      expect(result.date).toBe('2026-06-17');
      expect(result.boogleRecords).toEqual([]);
      expect(result.lifeRecord).toBeNull();
    });

    it('KST 기준 하루 경계(전날 15:00 UTC ~ 당일 14:59:59.999 UTC)로 조회한다', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([]);
      prisma.lifeRecord.findFirst.mockResolvedValue(null);

      await service.getDailyRecords('1', '2026-06-17');

      const findManyMock = prisma.boogleRecord.findMany as jest.Mock<
        unknown,
        [{ where: { regDate: { gte: Date; lte: Date } } }]
      >;
      const callArgs = findManyMock.mock.calls[0][0];
      expect(callArgs.where.regDate.gte.toISOString()).toBe(
        '2026-06-16T15:00:00.000Z',
      );
      expect(callArgs.where.regDate.lte.toISOString()).toBe(
        '2026-06-17T14:59:59.999Z',
      );
    });

    it('부글/생활 기록을 응답 형태로 매핑한다 (생활 태그·음식·약 포함)', async () => {
      prisma.boogleRecord.findMany.mockResolvedValue([
        {
          id: 100n,
          regDate: new Date('2026-06-17T08:30:00.000Z'),
          hasBowel: true,
          stoolBristol: 4,
          stoolSimple: 'M',
          bowelFeeling: 'C',
          stomach: 'N',
          distension: 'N',
          remainingFeeling: 'N',
          urgency: 'N',
          takenTime: 2,
          amount: 'N',
          color: 'B',
          updateDate: null,
        },
      ]);
      prisma.lifeRecord.findFirst.mockResolvedValue({
        id: 55n,
        regDate: new Date('2026-06-17T21:00:00.000Z'),
        sleep: 'N',
        stress: 'L',
        water: 'H',
        waterIntake: 3,
        mealRegular: 'R',
        sleepTime: 2,
        exercise: 'L',
        caffeine: 'O',
        outing: 'N',
        hormone: 'N',
        memo: null,
        autoTags: null,
        updateTime: null,
        lifeTags: [{ tag: { id: 7n, name: '야식' } }],
        foodTags: [{ food: { id: 2, name: '기름진 음식' } }],
        medicineMaps: [{ medicine: { id: 1, name: '유산균' } }],
      });

      const result = await service.getDailyRecords('1', '2026-06-17');

      expect(result.boogleRecords[0]).toMatchObject({
        id: 100,
        hasBowel: true,
        stoolSimple: 'M',
      });
      // 부글 기록은 태그 구조 삭제(#24)로 memo/autoTags/tags를 더 이상 포함하지 않는다.
      expect(result.boogleRecords[0]).not.toHaveProperty('tags');
      expect(result.boogleRecords[0]).not.toHaveProperty('memo');
      expect(result.boogleRecords[0]).not.toHaveProperty('autoTags');
      expect(result.lifeRecord).toMatchObject({
        id: 55,
        water: 'H',
        waterIntake: 3,
        autoTags: [],
        foods: [{ id: 2, name: '기름진 음식' }],
        medicines: [{ id: 1, name: '유산균' }],
        tags: [{ id: 7, name: '야식' }],
      });
    });
  });
});
