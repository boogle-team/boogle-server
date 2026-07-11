import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HomeService } from './home.service';

describe('HomeService', () => {
  let service: HomeService;
  let prisma: {
    member: { findUnique: jest.Mock };
    monthlyRecord: { findFirst: jest.Mock };
    boogleRecord: { findMany: jest.Mock };
    lifeRecord: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      member: { findUnique: jest.fn() },
      monthlyRecord: { findFirst: jest.fn() },
      boogleRecord: { findMany: jest.fn() },
      lifeRecord: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HomeService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<HomeService>(HomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('회원이 없으면 NotFoundException을 던진다', async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    await expect(service.getHome(1n, '2026-05-12')).rejects.toBeInstanceOf(
      NotFoundException,
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

    const result = await service.getHome(1n, '2026-05-12');

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

    const result = await service.getHome(1n, '2026-05-12');

    expect(result.user.userType).toBe('R');
    expect(result.user.userTypeLabel).toBe('규칙형');
  });

  it('오늘 부글 기록이 있으면 boogleCount/greeting/목록을 채운다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany
      .mockResolvedValueOnce([
        {
          id: 100n,
          regDate: new Date('2026-05-12T08:30:00.000Z'),
          hasBowel: true,
          stoolBristol: 4,
          stoolSimple: 'M',
          bowelFeeling: 'C',
          stomach: 'N',
        },
      ])
      .mockResolvedValueOnce([]) // week
      .mockResolvedValueOnce([]); // streak lookback
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome(1n, '2026-05-12');

    expect(result.boogleCount).toBe(1);
    expect(result.today.greeting).toBe('오늘 부글 신호를 보냈어요!');
    expect(result.boogleRecords[0]).toMatchObject({
      id: 100,
      hasBowel: true,
      stoolSimple: 'M',
    });
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
      mealRegular: 'R',
      foodTags: [{ food: { id: 1, name: '자극적인 음식' } }],
    });

    const result = await service.getHome(1n, '2026-05-12');

    expect(result.lifeRecord).toMatchObject({
      id: 55,
      sleep: 'B',
      foods: [{ id: 1, name: '자극적인 음식' }],
    });
  });

  it('전날까지 연속 기록이 있으면 streak을 계산한다', async () => {
    prisma.member.findUnique.mockResolvedValue({
      nickname: '땅콩잼',
      regDate: new Date('2026-04-30T00:00:00.000Z'),
    });
    prisma.monthlyRecord.findFirst.mockResolvedValue(null);
    prisma.boogleRecord.findMany
      .mockResolvedValueOnce([]) // 오늘은 아직 기록 없음
      .mockResolvedValueOnce([]) // week
      .mockResolvedValueOnce([
        { regDate: new Date('2026-05-11T08:00:00.000Z') },
        { regDate: new Date('2026-05-10T08:00:00.000Z') },
      ]); // streak lookback: 어제, 그제 기록 있음
    prisma.lifeRecord.findFirst.mockResolvedValue(null);

    const result = await service.getHome(1n, '2026-05-12');

    expect(result.streak).toBe(2);
  });
});
