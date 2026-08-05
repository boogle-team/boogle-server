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
  };

  const reportServiceMock = {
    getWeeklyReport: jest.fn(),
  };

  const healthGuideRow = {
    id: 1,
    title: '정상 배변 횟수는?',
    summary: '정상적인 배변 횟수는 사람마다 달라요.',
    category: 'H',
    source: null,
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
        subtitle: null,
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

  const activePatternGuideForFeedback = {
    category: 'P',
    status: 'A',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-22T03:00:00.000Z'));

    jest.resetAllMocks();

    prismaMock.guideFeedback.findUnique.mockResolvedValue(null);
    prismaMock.guideFeedback.findMany.mockResolvedValue([]);

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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('가이드 상세 조회 예외', () => {
    it.each(['abc', '0'])(
      'guideId=%s이면 GUIDE_INVALID_ID를 반환한다',
      async (guideId) => {
        await expect(service.getGuideDetail(1n, guideId)).rejects.toMatchObject(
          {
            errorCode: GuideErrorCode.GUIDE_INVALID_ID,
          },
        );

        expect(prismaMock.guide.findUnique).not.toHaveBeenCalled();
      },
    );

    it('가이드가 없으면 GUIDE_CONTENT_NOT_FOUND를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(null);

      await expect(service.getGuideDetail(1n, '1')).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_CONTENT_NOT_FOUND,
      });
    });

    it('비활성 가이드면 GUIDE_CONTENT_INACTIVE를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce({
        ...healthGuideRow,
        status: 'D',
      });

      await expect(service.getGuideDetail(1n, '1')).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_CONTENT_INACTIVE,
      });

      expect(prismaMock.guide.findMany).not.toHaveBeenCalled();
    });
  });

  describe('가이드 피드백 예외', () => {
    it('허용되지 않은 피드백이면 GUIDE_INVALID_FEEDBACK을 반환한다', async () => {
      await expect(
        service.createGuideFeedback(1n, '101', {
          feedback: 'X',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_INVALID_FEEDBACK,
      });

      expect(prismaMock.guide.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.guideFeedback.create).not.toHaveBeenCalled();
    });

    it('피드백 대상 가이드가 없으면 GUIDE_CONTENT_NOT_FOUND를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createGuideFeedback(1n, '101', {
          feedback: 'G',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_CONTENT_NOT_FOUND,
      });

      expect(prismaMock.guideFeedback.findUnique).not.toHaveBeenCalled();
    });

    it('피드백 대상 가이드가 비활성이면 GUIDE_CONTENT_INACTIVE를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce({
        status: 'D',
      });

      await expect(
        service.createGuideFeedback(1n, '101', {
          feedback: 'G',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_CONTENT_INACTIVE,
      });

      expect(prismaMock.guideFeedback.findUnique).not.toHaveBeenCalled();
    });

    it('이미 피드백이 있으면 GUIDE_FEEDBACK_ALREADY_EXISTS를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(
        activePatternGuideForFeedback,
      );
      prismaMock.guideFeedback.findUnique.mockResolvedValueOnce({
        id: 501n,
      });

      await expect(
        service.createGuideFeedback(1n, '101', {
          feedback: 'G',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_FEEDBACK_ALREADY_EXISTS,
      });

      expect(prismaMock.guideFeedback.create).not.toHaveBeenCalled();
    });

    it('동시 등록으로 P2002가 발생해도 GUIDE_FEEDBACK_ALREADY_EXISTS를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(
        activePatternGuideForFeedback,
      );
      prismaMock.guideFeedback.findUnique.mockResolvedValueOnce(null);
      prismaMock.guideFeedback.create.mockRejectedValueOnce(
        Object.assign(new Error('unique constraint'), {
          code: 'P2002',
        }),
      );

      await expect(
        service.createGuideFeedback(1n, '101', {
          feedback: 'G',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_FEEDBACK_ALREADY_EXISTS,
      });
    });

    it('수정할 피드백이 없으면 GUIDE_FEEDBACK_NOT_FOUND를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(
        activePatternGuideForFeedback,
      );
      prismaMock.guideFeedback.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateGuideFeedback(1n, '101', {
          feedback: 'A',
        }),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_FEEDBACK_NOT_FOUND,
      });

      expect(prismaMock.guideFeedback.update).not.toHaveBeenCalled();
    });

    it('삭제할 피드백이 없으면 GUIDE_FEEDBACK_NOT_FOUND를 반환한다', async () => {
      prismaMock.guide.findUnique.mockResolvedValueOnce(
        activePatternGuideForFeedback,
      );
      prismaMock.guideFeedback.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteGuideFeedback(1n, '101'),
      ).rejects.toMatchObject({
        errorCode: GuideErrorCode.GUIDE_FEEDBACK_NOT_FOUND,
      });

      expect(prismaMock.guideFeedback.delete).not.toHaveBeenCalled();
    });
  });

  it('Guide.id로 H 상세를 조회하고 모든 본문, 조언, 추천 Guide를 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue(healthGuideRow);
    prismaMock.guide.findMany.mockResolvedValue([
      {
        id: 2,
        title: '브리스톨 변 형태 척도란?',
        summary: '변 형태를 확인해 보세요.',
      },
      {
        id: 3,
        title: '스트레스와 장의 관계',
        summary: '스트레스와 장의 관계를 알아보세요.',
      },
    ]);

    const result = await service.getGuideDetail(1n, '1');

    expect(prismaMock.guide.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );

    expect(prismaMock.guide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            not: 1,
          },
          category: 'H',
          status: 'A',
        },
      }),
    );

    expect(result.guideId).toBe(1);
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
        subtitle: null,
        content: '갑작스러운 변화가 더 중요할 수 있어요.',
      },
    ]);
    expect(result.recommendedGuides).toHaveLength(2);
    expect(result.patternReason).toBeNull();
    expect(result).not.toHaveProperty('warningAnalysis');
  });

  it('P Guide를 ID로 연결해 제목이 변경되어도 실제 감지 룰만 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      id: 109,
      title: 'DB에서 문구가 변경된 묽은 변 가이드',
      summary: '묽은 변이 반복될 때 확인해 보세요.',
      category: 'P',
      source: null,
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
    reportServiceMock.getWeeklyReport.mockResolvedValue(weeklyPatternReport);

    prismaMock.guideFeedback.findUnique.mockResolvedValueOnce({
      feedback: 'G',
    });

    const result = await service.getGuideDetail(1n, '109');

    if (result.category !== 'P') {
      throw new Error('패턴 가이드 응답이어야 합니다.');
    }

    expect(result.feedbackStatus).toBe('G');

    expect(reportServiceMock.getWeeklyReport).toHaveBeenCalledWith(1n, {
      weekStartDate: '2026-07-20',
      includeGuide: false,
    });
    expect(result.guideId).toBe(109);
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
      id: 101,
      title: '수분과 딱딱한 변의 관계',
      summary: '수분과 변 상태의 관계',
      category: 'P',
      source: null,
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

    const result = await service.getGuideDetail(1n, '101');

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

    expect(result.category).toBe('P');

    if (result.category === 'P') {
      expect(result.feedbackStatus).toBeNull();
    }
  });

  it('W의 정적 본문과 DB 조언을 반환하고 사용자 위험 신호 분석은 포함하지 않는다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      id: 1001,
      title: '이런 증상이면 전문가 상담을',
      summary: '증상이 지속되면 전문가와 상담해 보세요.',
      category: 'W',
      source: null,
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
          subtitle: '가능한 빨리 내과 진료를 받아보세요',
          content:
            '검은 변은 위·소장 등 소화관 위쪽에서, 붉은 변은 대장·항문 근처에서 출혈이 있다는 신호일 수 있어요.',
        },
      ],
    });

    const result = await service.getGuideDetail(1n, '1001');

    expect(result.category).toBe('W');
    expect(result.source).toBeNull();
    expect(result.contents).toEqual([
      {
        contentId: 401,
        order: 1,
        subtitle: '혈변·흑변',
        content: '붉은색이나 검은색 변이 보이는 경우',
      },
    ]);
    expect(result.advices).toEqual([
      {
        adviceId: 501,
        order: 1,
        subtitle: '가능한 빨리 내과 진료를 받아보세요',
        content:
          '검은 변은 위·소장 등 소화관 위쪽에서, 붉은 변은 대장·항문 근처에서 출혈이 있다는 신호일 수 있어요.',
      },
    ]);
    expect(result.recommendedGuides).toEqual([]);
    expect(result.patternReason).toBeNull();
    expect(result).not.toHaveProperty('warningAnalysis');
  });

  it('가이드 화면의 패턴 카드에 현재 주 피드백 상태를 반환한다', async () => {
    reportServiceMock.getWeeklyReport.mockResolvedValue({
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
      guides: [
        {
          guideId: 101,
          title: '수분과 딱딱한 변의 관계',
          summary: '수분이 부족했던 날 딱딱한 변이 함께 나타났어요.',
          matchedRuleCodes: ['LOW_WATER_WITH_HARD_STOOL'],
        },
      ],
    });
    prismaMock.guide.findMany.mockResolvedValue([
      {
        id: 1,
        title: '정상 배변 횟수는?',
        summary: '정상 배변 범위를 확인해보세요.',
        category: 'H',
      },
      {
        id: 1001,
        title: '이런 증상이면 전문가 상담을',
        summary: '주의 신호를 확인해보세요.',
        category: 'W',
      },
    ]);
    prismaMock.guideFeedback.findMany.mockResolvedValueOnce([
      {
        guideId: 101,
        feedback: 'G',
      },
    ]);

    const result = await service.getGuideScreen(1n);
    const cards = [
      ...result.patternGuideSection.guides,
      ...result.healthGuideSection.guides,
      ...result.warningGuideSection.guides,
    ];

    expect(result.patternGuideSection.sectionTitle).toBe('내 패턴 기반');
    expect(cards).toHaveLength(3);

    expect(result.patternGuideSection.guides[0]).toEqual({
      guideId: 101,
      category: 'P',
      title: '수분과 딱딱한 변의 관계',
      summary: '수분이 부족했던 날 딱딱한 변이 함께 나타났어요.',
      matchedRuleCodes: ['LOW_WATER_WITH_HARD_STOOL'],
      feedbackStatus: 'G',
    });

    expect(result.healthGuideSection.guides[0]).not.toHaveProperty(
      'feedbackStatus',
    );
    expect(result.warningGuideSection.guides[0]).not.toHaveProperty(
      'feedbackStatus',
    );

    expect(prismaMock.guideFeedback.findMany).toHaveBeenCalledWith({
      where: {
        userId: 1n,
        weekStartDate: new Date('2026-07-20T00:00:00.000Z'),
        guideId: {
          in: [101],
        },
      },
      select: {
        guideId: true,
        feedback: true,
      },
    });

    expect(result.sectionOrder).toEqual(['PATTERN', 'HEALTH', 'WARNING']);

    expect(result.warningGuideSection.guides).toEqual([
      {
        guideId: 1001,
        category: 'W',
        title: '이런 증상이면 전문가 상담을',
        summary: '주의 신호를 확인해보세요.',
      },
    ]);

    expect(result.warningGuideSection).not.toHaveProperty('period');
    expect(result.warningGuideSection).not.toHaveProperty('highlighted');
    expect(result.warningGuideSection).not.toHaveProperty('detectedFlags');
  });

  it('조언 소제목이 없으면 subtitle을 null로 반환한다', async () => {
    prismaMock.guide.findUnique.mockResolvedValue({
      ...healthGuideRow,
      guideAdvices: [
        {
          id: 201,
          subtitle: null,
          content: '갑작스러운 변화가 더 중요할 수 있어요.',
        },
      ],
    });
    prismaMock.guide.findMany.mockResolvedValue([]);

    const result = await service.getGuideDetail(1n, '1');

    expect(result.advices[0]).toEqual({
      adviceId: 201,
      order: 1,
      subtitle: null,
      content: '갑작스러운 변화가 더 중요할 수 있어요.',
    });
  });
});
