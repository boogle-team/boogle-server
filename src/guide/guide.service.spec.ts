import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { GuideService } from './guide.service';
import { ReportService } from '@/report/report.service';
import { GuideErrorCode } from './guide-error-code.enum';

describe('GuideService', () => {
  let service: GuideService;

  const prismaMock = {
    guide: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    guideFeedback: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    boogleRecord: {
      findMany: jest.fn(),
    },
  };

  const reportServiceMock = {
    getWeeklyReport: jest.fn(),
  };

  const healthGuideRow = {
    id: 7,
    title: '정상 배변 횟수는?',
    summary: '정상적인 배변 횟수는 사람마다 달라요.',
    category: 'H',
    status: 'A',
    guideContents: [
      {
        id: 103,
        subtitle: '정상 범위',
        content: '본문 1',
      },
      {
        id: 108,
        subtitle: null,
        content: '본문 2',
      },
    ],
    guideAdvices: [
      {
        id: 201,
        content: '갑작스러운 변화가 더 중요할 수 있어요.',
      },
    ],
  };

  const weeklyPatternReport = {
    period: {
      type: 'WEEKLY',
      startDate: '2026-07-20',
      endDate: '2026-07-26',
    },
    dataStatus: 'ENOUGH',
    recordStats: {
      recordedDays: 5,
      requiredDays: 3,
      completionScore: 71.4,
    },
    patternCards: [
      {
        ruleCode: 'FREQUENT_LOOSE_STOOL',
        level: 'WARN',
        title: '묽은 변 경향',
        description: '묽은 변이 자주 나타났어요.',
        evidence: [
          {
            key: 'looseStoolCount',
            label: '묽은 변 횟수',
            value: 4,
            threshold: 3,
            unit: 'COUNT',
          },
        ],
      },
      {
        ruleCode: 'CONTINUOUS_LOOSE_STOOL',
        level: 'WARN',
        title: '묽은 변 지속',
        description: '묽은 변이 며칠째 이어졌어요.',
        evidence: [],
      },
      {
        ruleCode: 'IRREGULAR_MEAL',
        level: 'WARN',
        title: '식사 시간 불규칙',
        description: '식사 시간이 불규칙했던 날이 많았어요.',
        evidence: [],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuideService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ReportService,
          useValue: reportServiceMock,
        },
      ],
    }).compile();

    service = module.get<GuideService>(GuideService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('주의 신호를 KST 월 경계로 조회한다', async () => {
    reportServiceMock.getWeeklyReport.mockResolvedValue({
      period: {
        type: 'WEEKLY',
        startDate: '2026-07-20',
        endDate: '2026-07-26',
      },
      dataStatus: 'INSUFFICIENT',
      recordStats: {
        recordedDays: 0,
        requiredDays: 3,
        completionScore: 0,
      },
      guides: [],
    });
    prismaMock.guide.findMany.mockResolvedValue([]);
    prismaMock.boogleRecord.findMany.mockResolvedValue([]);

    await service.getGuideScreen(1n, {
      monthStartDate: '2026-07-01',
      weekStartDate: '2026-07-20',
    });

    expect(prismaMock.boogleRecord.findMany).toHaveBeenCalledWith({
      where: {
        userId: 1n,
        status: 'A',
        regDate: {
          gte: new Date('2026-06-30T15:00:00.000Z'),
          lt: new Date('2026-07-31T15:00:00.000Z'),
        },
        OR: [
          {
            hasBowel: true,
            color: {
              in: ['R', 'N'],
            },
          },
          {
            stomach: 'L',
          },
        ],
      },
      select: {
        regDate: true,
        hasBowel: true,
        color: true,
        stomach: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  });

  it('월요일이 아닌 주 시작일을 Report 호출 전에 거부한다', async () => {
    await expect(
      service.getGuideScreen(1n, {
        weekStartDate: '2026-07-21',
      }),
    ).rejects.toMatchObject({
      errorCode: GuideErrorCode.GUIDE_INVALID_WEEK_FORMAT,
    });

    expect(reportServiceMock.getWeeklyReport).not.toHaveBeenCalled();
  });

  it('Guide.id로 H 상세을 조회하고 모든 본문, 조언, 추천 Guide를 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue(healthGuideRow);
    prismaMock.guideFeedback.findUnique.mockResolvedValue(null);
    prismaMock.guide.findMany.mockResolvedValue([
      {
        id: 8,
        title: '브리스톨 변 형태 척도란?',
        summary: '변 형태를 확인해 보세요.',
      },
      {
        id: 9,
        title: '스트레스와 장의 관계',
        summary: '스트레스와 장의 관계를 알아보세요.',
      },
    ]);

    const result = await service.getGuideDetail(1n, '7', {});

    expect(prismaMock.guide.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 7,
        },
      }),
    );

    expect(prismaMock.guide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            not: 7,
          },
          category: 'H',
          status: 'A',
        },
      }),
    );

    expect(result.guideId).toBe(7);
    expect(result.contents).toEqual([
      {
        contentId: 103,
        order: 1,
        subtitle: '정상 범위',
        content: '본문 1',
      },
      {
        contentId: 108,
        order: 2,
        subtitle: null,
        content: '본문 2',
      },
    ]);
    expect(result.advices).toEqual([
      {
        adviceId: 201,
        order: 1,
        content: '갑작스러운 변화가 더 중요할 수 있어요.',
      },
    ]);
    expect(result.recommendedGuides).toHaveLength(2);
    expect(result.patternReason).toBeNull();
    expect(result.warningAnalysis).toBeNull();
  });

  it('P Guide에 연결되고 실제 감지된 룰만 patternReason으로 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      id: 12,
      title: '묽은 변이 잦다면?',
      summary: '묽은 변이 반복될 때 확인해 보세요.',
      category: 'P',
      status: 'A',
      guideContents: [
        {
          id: 301,
          subtitle: '묽은 변이 생기는 이유',
          content: '본문',
        },
      ],
      guideAdvices: [],
    });
    prismaMock.guideFeedback.findUnique.mockResolvedValue({
      feedback: 'G',
    });
    reportServiceMock.getWeeklyReport.mockResolvedValue(weeklyPatternReport);

    const result = await service.getGuideDetail(1n, '12', {
      weekStartDate: '2026-07-20',
    });

    expect(reportServiceMock.getWeeklyReport).toHaveBeenCalledWith(1n, {
      weekStartDate: '2026-07-20',
      includeGuide: false,
    });
    expect(result.guideId).toBe(12);
    expect(result.feedbackStatus).toBe('G');
    expect(result.patternReason?.matchedRuleCodes).toEqual([
      'FREQUENT_LOOSE_STOOL',
      'CONTINUOUS_LOOSE_STOOL',
    ]);
    expect(
      result.patternReason?.matchedPatterns.map((pattern) => pattern.ruleCode),
    ).not.toContain('IRREGULAR_MEAL');
    expect(result.recommendedGuides).toEqual([]);
  });

  it('주간 기록이 부족해도 P Guide의 정적 본문을 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      id: 4,
      title: '수분과 딱딱한 변의 관계',
      summary: '수분과 변 상태의 관계',
      category: 'P',
      status: 'A',
      guideContents: [
        {
          id: 103,
          subtitle: '왜 딱딱해질까요?',
          content: '본문',
        },
      ],
      guideAdvices: [],
    });
    prismaMock.guideFeedback.findUnique.mockResolvedValue(null);
    reportServiceMock.getWeeklyReport.mockResolvedValue({
      period: {
        type: 'WEEKLY',
        startDate: '2026-07-20',
        endDate: '2026-07-26',
      },
      dataStatus: 'INSUFFICIENT',
      recordStats: {
        recordedDays: 2,
        requiredDays: 3,
        completionScore: 28.6,
      },
      patternCards: [],
    });

    const result = await service.getGuideDetail(1n, '4', {
      weekStartDate: '2026-07-20',
    });

    expect(result.contents[0].contentId).toBe(103);
    expect(result.patternReason).toMatchObject({
      matched: false,
      matchedRuleCodes: [],
      matchedPatterns: [],
    });

    expect(result.patternReason?.recordStatus).toMatchObject({
      dataStatus: 'INSUFFICIENT',
      recordedDays: 2,
      requiredDays: 3,
    });

    expect(result.patternReason?.recordStatus).toEqual({
      dataStatus: 'INSUFFICIENT',
      recordedDays: 2,
      requiredDays: 3,
      completionScore: 28.6,
    });
  });

  it('W의 정적 본문과 DB 조언, 사용자별 경고 분석을 함께 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      id: 18,
      title: '이런 증상이면 전문가 상담을',
      summary: '증상이 지속되면 전문가와 상담해 보세요.',
      category: 'W',
      status: 'A',
      guideContents: [
        {
          id: 401,
          subtitle: '혈변·흑변',
          content: '붉은색이나 검은색 변이 보이는 경우',
        },
      ],
      guideAdvices: [
        {
          id: 501,
          content: '증상이 지속되면 병원에 방문하세요.',
        },
      ],
    });
    prismaMock.guideFeedback.findUnique.mockResolvedValue(null);
    prismaMock.boogleRecord.findMany.mockResolvedValue([
      {
        id: 9001n,
        regDate: new Date('2026-07-22T15:30:00.000Z'),
        color: 'R',
        stomach: null,
      },
    ]);

    const result = await service.getGuideDetail(1n, '18', {
      monthStartDate: '2026-07-01',
    });

    expect(result.advices).toEqual([
      {
        adviceId: 501,
        order: 1,
        content: '증상이 지속되면 병원에 방문하세요.',
      },
    ]);
    expect(result.warningAnalysis).toEqual({
      period: {
        type: 'MONTHLY',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      },
      matched: true,
      detectedFlags: [
        {
          flagCode: 'FLAG_BLOOD_RED',
          label: '붉은색 변 기록',
          detectedDate: '2026-07-23',
          sourceRecordId: '9001',
        },
      ],
    });
  });

  it('배변이 없어도 심한 복통이면 주의 신호를 반환한다', async () => {
    reportServiceMock.getWeeklyReport.mockResolvedValue({
      period: {
        type: 'WEEKLY',
        startDate: '2026-07-20',
        endDate: '2026-07-26',
      },
      dataStatus: 'INSUFFICIENT',
      recordStats: {
        recordedDays: 0,
        requiredDays: 3,
        completionScore: 0,
      },
      guides: [],
    });
    prismaMock.guide.findMany.mockResolvedValue([]);
    prismaMock.boogleRecord.findMany.mockResolvedValue([
      {
        regDate: new Date('2026-07-22T16:30:00.000Z'),
        hasBowel: false,
        color: null,
        stomach: 'L',
      },
    ]);

    const result = await service.getGuideScreen(1n, {
      weekStartDate: '2026-07-20',
      monthStartDate: '2026-07-01',
    });

    expect(result.warningGuideSection.detectedFlags).toContainEqual({
      flagCode: 'FLAG_PAIN_SEVERE',
      label: '심한 복통이 기록되었어요.',
      detectedDate: '2026-07-23',
    });
  });
});
