import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { CalendarService } from '@/calendar/calendar.service';
import { HomeErrorCode } from './home-error-code.enum';
import { HomeService } from './home.service';

describe('HomeService', () => {
  let service: HomeService;
  let prisma: {
    member: { findUnique: jest.Mock };
    monthlyRecord: { findFirst: jest.Mock };
    boogleRecord: { findMany: jest.Mock };
    lifeRecord: { findFirst: jest.Mock };
  };
  let calendarService: { getDailyStatuses: jest.Mock };

  beforeEach(async () => {
    prisma = {
      member: { findUnique: jest.fn() },
      monthlyRecord: { findFirst: jest.fn() },
      boogleRecord: { findMany: jest.fn() },
      lifeRecord: { findFirst: jest.fn() },
    };
    calendarService = { getDailyStatuses: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendarService },
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('회원이 없으면 BusinessException(MEMBER_NOT_FOUND, 404)을 던진다', async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    await expect(service.getHome('1', '2026-05-12')).rejects.toMatchObject({
      errorCode: HomeErrorCode.MEMBER_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
    await expect(service.getHome('1', '2026-05-12')).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it('기록이 하나도 없으면 빈 기본값을 반환한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany.mockResolvedValue([]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome('1', '2026-05-12');

    expect(result.user).toMatchObject({
      nickname: '땅콩잼',
      userType: null,
      userTypeLabel: null,
      joinedDays: 13,
    });
    expect(result.boogleCount).toBe(0);
    expect(result.boogleRecords).toEqual([]);
    expect(result.lifeRecord).toBeNull();
    expect(result.weeklyPattern).toBeNull();
    expect(result.streak).toBe(0);
    expect(result.weekStrip).toHaveLength(7);
    expect(result.weekStrip.every((d) => d.hasRecord === false)).toBe(true);
  });

  it('월간 유형이 있으면 라벨을 붙여서 반환한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue({ userType: 'R' });
    prisma.boogleRecord.findMany.mockResolvedValue([]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome('1', '2026-05-12');

    expect(result.user.userType).toBe('R');
    expect(result.user.userTypeLabel).toBe('규칙형');
  });

  it('오늘 부글 기록이 있으면 boogleCount/greeting/목록을 채운다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany.mockResolvedValue([
      {
        id: 100n,
        // regDate는 KST 자정(=UTC 15:00)으로 저장되므로 시각 표시에 쓸 수 없다.
        regDate: new Date('2026-05-11T15:00:00.000Z'),
        // 실제 배변 시각: UTC 08:30 = KST 17:30
        bowelMovementAt: new Date('2026-05-12T08:30:00.000Z'),
        hasBowel: true,
        stoolBristol: 4,
        stoolSimple: 'M',
        bowelFeeling: 'C',
        stomach: 1,
      },
    ]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome('1', '2026-05-12');

    expect(result.boogleCount).toBe(1);
    expect(result.today.greeting).toBe('오늘 부글 신호를 보냈어요!');
    expect(result.boogleRecords[0]).toMatchObject({
      id: 100,
      hasBowel: true,
      stoolSimple: 'M',
      // 시각은 regDate(자정)가 아니라 bowelMovementAt을 KST HH:mm으로 내려준다.
      bowelMovementAt: '17:30',
    });
  });

  it('배변 시각을 기록하지 않았으면 bowelMovementAt은 null이다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany.mockResolvedValue([
      {
        id: 101n,
        regDate: new Date('2026-05-11T15:00:00.000Z'),
        bowelMovementAt: null,
        hasBowel: false,
        stoolBristol: null,
        stoolSimple: null,
        bowelFeeling: null,
        stomach: null,
      },
    ]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome('1', '2026-05-12');

    expect(result.boogleRecords[0].bowelMovementAt).toBeNull();
  });

  it('생활 기록이 있으면 음식 태그까지 매핑한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany.mockResolvedValue([]);
    prisma.lifeRecord.findFirst.mockResolvedValue({
      id: 55n,
      regDate: new Date('2026-05-12T21:00:00.000Z'),
      sleep: 'B',
      stress: 'L',
      water: 'L',
      waterIntake: 2,
      mealRegular: 'R',
      autoTags: '음주,자극적,야식',
      foodTags: [{ food: { id: 1, name: '자극적인 음식' } }],
    });

    const result = await service.getHome('1', '2026-05-12');

    expect(result.lifeRecord).toMatchObject({
      id: 55,
      sleep: 'B',
      waterIntake: 2,
      autoTags: ['음주', '자극적', '야식'],
      foods: [{ id: 1, name: '자극적인 음식' }],
    });
  });

  it('전날까지 연속 기록이 있으면 streak을 계산한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    // 오늘 기록은 없고, 어제·그제 기록만 있는 상황 (단일 조회 결과에 다 포함)
    prisma.boogleRecord.findMany.mockResolvedValue([
      { regDate: new Date('2026-05-10T08:00:00.000Z') },
      { regDate: new Date('2026-05-11T08:00:00.000Z') },
    ]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome('1', '2026-05-12');

    expect(result.streak).toBe(2);
  });

  it('오늘 포함 최근 400일 범위(KST 기준)로 boogle_record를 한 번만 조회한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany.mockResolvedValue([]);
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    await service.getHome('1', '2026-05-12');

    expect(prisma.boogleRecord.findMany).toHaveBeenCalledTimes(1);

    const findManyMock = prisma.boogleRecord.findMany as jest.Mock<
      unknown,
      [{ where: { regDate: { gte: Date; lt: Date } } }]
    >;
    const callArgs = findManyMock.mock.calls[0][0];
    expect(callArgs.where.regDate.gte.toISOString()).toBe(
      '2025-04-06T15:00:00.000Z',
    );
    expect(callArgs.where.regDate.lt.toISOString()).toBe(
      '2026-05-12T15:00:00.000Z',
    );
  });

  describe('getDateSummary', () => {
    it('baseDate 앞뒤 30일 범위로 캘린더 상태 조회를 위임한다', async () => {
      calendarService.getDailyStatuses.mockResolvedValue([]);

      const result = await service.getDateSummary('1', '2026-05-12');

      expect(result.baseDate).toBe('2026-05-12');
      // baseDate ±30일 = 2026-04-12 ~ 2026-06-11
      expect(calendarService.getDailyStatuses).toHaveBeenCalledWith(
        '1',
        '2026-04-12',
        '2026-06-11',
      );
    });

    it('baseDate 생략 시 오늘(KST) 기준으로 ±30일 범위를 계산한다', async () => {
      // 2026-05-12T03:00Z = KST 2026-05-12 12:00 → 오늘 = 2026-05-12
      jest.useFakeTimers().setSystemTime(new Date('2026-05-12T03:00:00.000Z'));
      calendarService.getDailyStatuses.mockResolvedValue([]);

      try {
        const result = await service.getDateSummary('1');

        expect(result.baseDate).toBe('2026-05-12');
        expect(calendarService.getDailyStatuses).toHaveBeenCalledWith(
          '1',
          '2026-04-12',
          '2026-06-11',
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('캘린더가 반환한 날짜별 상태를 그대로 days로 내려준다', async () => {
      const days = [
        { date: '2026-05-11', boogleStatus: 'BOWEL', hasLifeRecord: true },
        { date: '2026-05-12', boogleStatus: 'NONE', hasLifeRecord: false },
      ];
      calendarService.getDailyStatuses.mockResolvedValue(days);

      const result = await service.getDateSummary('1', '2026-05-12');

      expect(result.days).toEqual(days);
    });
  });
});
