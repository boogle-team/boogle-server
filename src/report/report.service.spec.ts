import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from './report.service';
import { ReportErrorCode } from './report-error-code.enum';
import { BoogleRecordForReport } from './dto/report-record.dto';
import * as monthlyPdfRenderer from './pdf/monthly-pdf.renderer';
import type {
  ChangeTrend,
  FrequentTimeSlotDto,
  WeeklyGuideDto,
  BowelRhythmByDayDto,
} from './dto/weekly-report-response.dto';
import {
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from './pattern/weekly-pattern.constants';

function kstDate(dateKey: string, time = '09:00'): Date {
  return new Date(`${dateKey}T${time}:00.000+09:00`);
}

function calendarDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

interface GuideRuleBindingTestAccessor {
  findGuidesByRules(
    ruleCodes: WeeklyRuleCode[],
    includeGuide: boolean,
  ): Promise<WeeklyGuideDto[]>;
}

interface WeeklyTrendTestAccessor {
  resolveTrend(bowelCountDiff: number): ChangeTrend;
}

interface FrequentTimeSlotsTestAccessor {
  buildFrequentTimeSlots(
    records: BoogleRecordForReport[],
  ): FrequentTimeSlotDto[];
}

interface BoogleRecordQueryTestAccessor {
  findBoogleRecords(
    userId: bigint,
    startDate: Date,
    endDateExclusive: Date,
  ): Promise<BoogleRecordForReport[]>;
}

interface BowelRhythmByDayTestAccessor {
  buildBowelRhythmByDay(
    records: BoogleRecordForReport[],
    weekStartDate: Date,
  ): BowelRhythmByDayDto[];
}

function createBoogleRecord(
  dateKey: string,
  overrides: Partial<BoogleRecordForReport> = {},
): BoogleRecordForReport {
  const {
    id = BigInt(dateKey.slice(-2)),
    regDate = kstDate(dateKey),
    hasBowel = true,
    bowelMovementAt = hasBowel ? regDate : null,
    ...rest
  } = overrides;

  return {
    id,
    regDate,
    bowelMovementAt,
    hasBowel,
    stoolBristol: 4,
    stoolSimple: 'M',
    bowelFeeling: null,
    stomach: null,
    distension: null,
    remainingFeeling: null,
    urgency: null,
    takenTime: null,
    amount: null,
    ...rest,
  };
}

describe('ReportService', () => {
  let service: ReportService;

  const prismaMock = {
    member: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    boogleRecord: {
      findMany: jest.fn(),
    },
    lifeRecord: {
      findMany: jest.fn(),
    },
    weeklyRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    monthlyRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    guide: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    { bowelCountDiff: 1, expected: 'INCREASE' },
    { bowelCountDiff: -1, expected: 'DECREASE' },
    { bowelCountDiff: 0, expected: 'SAME' },
  ] as const)(
    '주간 배변 횟수 차이 $bowelCountDiff이면 trend는 $expected이다',
    ({ bowelCountDiff, expected }) => {
      const accessor = service as unknown as WeeklyTrendTestAccessor;

      expect(accessor.resolveTrend(bowelCountDiff)).toBe(expected);
    },
  );

  it('패턴 가이드를 제목이 아닌 고정 ID로 조회하고 바인딩한다', async () => {
    prismaMock.guide.findMany.mockResolvedValue([
      {
        id: 109,
        title: 'DB에서 문구가 변경된 묽은 변 가이드',
        summary: '묽은 변이 반복될 때 확인해 보세요.',
        category: 'P',
      },
    ]);

    const guideRuleBindingAccessor =
      service as unknown as GuideRuleBindingTestAccessor;

    const result = await guideRuleBindingAccessor.findGuidesByRules(
      [WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL],
      true,
    );

    expect(prismaMock.guide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: [109],
          },
          category: 'P',
          status: 'A',
        },
      }),
    );
    expect(result).toEqual([
      {
        guideId: 109,
        category: 'P',
        title: 'DB에서 문구가 변경된 묽은 변 가이드',
        summary: '묽은 변이 반복될 때 확인해 보세요.',
        matchedRuleCodes: ['FREQUENT_LOOSE_STOOL'],
      },
    ]);
  });

  it('잘못된 주 시작일 형식은 REPORT_INVALID_DATE_FORMAT을 반환한다', async () => {
    await expect(
      service.getWeeklyReport(1n, {
        weekStartDate: '2026/07/20',
      }),
    ).rejects.toMatchObject({
      errorCode: ReportErrorCode.REPORT_INVALID_DATE_FORMAT,
    });
  });

  it('월요일이 아닌 주 시작일은 REPORT_INVALID_DATE_RANGE를 반환한다', async () => {
    await expect(
      service.getWeeklyReport(1n, {
        weekStartDate: '2026-07-21',
      }),
    ).rejects.toMatchObject({
      errorCode: ReportErrorCode.REPORT_INVALID_DATE_RANGE,
    });
  });

  it('Boogle 조회에 bowelMovementAt과 결정적인 정렬 순서를 포함한다', async () => {
    prismaMock.boogleRecord.findMany.mockResolvedValueOnce([]);
    const accessor = service as unknown as BoogleRecordQueryTestAccessor;

    await accessor.findBoogleRecords(
      1n,
      new Date('2026-07-20T00:00:00.000Z'),
      new Date('2026-07-27T00:00:00.000Z'),
    );

    expect(prismaMock.boogleRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          regDate: true,
          bowelMovementAt: true,
          hasBowel: true,
          stoolBristol: true,
          stoolSimple: true,
          bowelFeeling: true,
          stomach: true,
          distension: true,
          remainingFeeling: true,
          urgency: true,
          takenTime: true,
          amount: true,
        },
        orderBy: [
          { regDate: 'asc' },
          { bowelMovementAt: 'asc' },
          { id: 'asc' },
        ],
      }),
    );
  });

  it('주간 시간대 통계는 유효한 bowelMovementAt만 사용한다', () => {
    const accessor = service as unknown as FrequentTimeSlotsTestAccessor;
    const records = [
      createBoogleRecord('2026-07-20', {
        regDate: kstDate('2026-07-20', '09:00'),
        bowelMovementAt: kstDate('2026-07-20', '20:30'),
      }),
      createBoogleRecord('2026-07-21', {
        regDate: kstDate('2026-07-21', '09:00'),
        bowelMovementAt: kstDate('2026-07-21', '21:15'),
      }),
      createBoogleRecord('2026-07-22', {
        bowelMovementAt: null,
      }),
      createBoogleRecord('2026-07-23', {
        hasBowel: false,
        bowelMovementAt: kstDate('2026-07-23', '08:00'),
      }),
    ];

    expect(accessor.buildFrequentTimeSlots(records)).toEqual([
      {
        timeSlot: 'EVENING',
        label: '저녁',
        count: 2,
      },
    ]);
  });

  it('요일별 배변 횟수와 해당 날짜의 마지막 변 상태를 반환한다', () => {
    const accessor = service as unknown as BowelRhythmByDayTestAccessor;
    const records = [
      createBoogleRecord('2026-08-03', {
        id: 1n,
        bowelMovementAt: kstDate('2026-08-03', '08:00'),
        stoolSimple: 'H',
      }),
      createBoogleRecord('2026-08-03', {
        id: 2n,
        bowelMovementAt: kstDate('2026-08-03', '19:00'),
        stoolSimple: 'T',
      }),
      createBoogleRecord('2026-08-04', {
        id: 3n,
        bowelMovementAt: kstDate('2026-08-04', '09:00'),
        stoolSimple: 'M',
      }),
    ];

    expect(
      accessor.buildBowelRhythmByDay(records, calendarDate('2026-08-03')),
    ).toEqual([
      {
        dayOfWeek: 'MON',
        label: '월',
        bowelCount: 2,
        stoolSimple: 'T',
      },
      {
        dayOfWeek: 'TUE',
        label: '화',
        bowelCount: 1,
        stoolSimple: 'M',
      },
    ]);
  });

  it('입력 순서와 관계없이 bowelMovementAt이 가장 늦은 기록의 상태를 사용한다', () => {
    const accessor = service as unknown as BowelRhythmByDayTestAccessor;
    const records = [
      createBoogleRecord('2026-08-03', {
        id: 2n,
        bowelMovementAt: kstDate('2026-08-03', '20:00'),
        stoolSimple: 'T',
      }),
      createBoogleRecord('2026-08-03', {
        id: 1n,
        bowelMovementAt: kstDate('2026-08-03', '08:00'),
        stoolSimple: 'H',
      }),
    ];

    const result = accessor.buildBowelRhythmByDay(
      records,
      calendarDate('2026-08-03'),
    );

    expect(result[0]).toMatchObject({
      bowelCount: 2,
      stoolSimple: 'T',
    });
  });

  it('마지막 배변의 변 상태가 없으면 stoolSimple을 null로 반환한다', () => {
    const accessor = service as unknown as BowelRhythmByDayTestAccessor;
    const records = [
      createBoogleRecord('2026-08-03', {
        id: 1n,
        bowelMovementAt: kstDate('2026-08-03', '08:00'),
        stoolSimple: 'M',
      }),
      createBoogleRecord('2026-08-03', {
        id: 2n,
        bowelMovementAt: kstDate('2026-08-03', '20:00'),
        stoolSimple: null,
      }),
    ];

    const result = accessor.buildBowelRhythmByDay(
      records,
      calendarDate('2026-08-03'),
    );

    expect(result[0]).toMatchObject({
      bowelCount: 2,
      stoolSimple: null,
    });
  });

  it('hasBowel이 false인 기록은 배변 리듬과 변 상태 계산에서 제외한다', () => {
    const accessor = service as unknown as BowelRhythmByDayTestAccessor;
    const records = [
      createBoogleRecord('2026-08-03', {
        hasBowel: false,
        bowelMovementAt: null,
        stoolSimple: 'H',
      }),
    ];

    expect(
      accessor.buildBowelRhythmByDay(records, calendarDate('2026-08-03')),
    ).toEqual([]);
  });

  describe('createPdfReport', () => {
    let renderMonthlyPdfSpy: jest.SpiedFunction<
      typeof monthlyPdfRenderer.renderMonthlyPdf
    >;

    const pdfBuffer = Buffer.from('%PDF-test', 'ascii');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-15T03:00:00.000Z'));

      prismaMock.boogleRecord.findMany.mockResolvedValue([]);
      prismaMock.lifeRecord.findMany.mockResolvedValue([]);
      renderMonthlyPdfSpy = jest
        .spyOn(monthlyPdfRenderer, 'renderMonthlyPdf')
        .mockResolvedValue(pdfBuffer);
    });

    afterEach(() => {
      renderMonthlyPdfSpy.mockRestore();
      jest.useRealTimers();
    });

    it('현재 월은 KST 오늘까지 조회하고 PDF 데이터와 파일명을 반환한다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );

      const result = await service.createPdfReport(1n, {
        monthStartDate: '2026-07-01',
      });

      expect(prismaMock.boogleRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 1n,
            status: 'A',
            regDate: {
              gte: new Date('2026-06-30T15:00:00.000Z'),
              lt: new Date('2026-07-15T15:00:00.000Z'),
            },
          },
        }),
      );
      expect(prismaMock.lifeRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 1n,
            status: 'A',
            regDate: {
              gte: new Date('2026-06-30T15:00:00.000Z'),
              lt: new Date('2026-07-15T15:00:00.000Z'),
            },
          },
        }),
      );
      expect(renderMonthlyPdfSpy).toHaveBeenCalledTimes(1);

      const pdfData = renderMonthlyPdfSpy.mock.calls[0][0];
      expect(pdfData.period).toEqual(
        expect.objectContaining({
          startDate: '2026-07-01',
          endDate: '2026-07-15',
          generatedDate: '2026-07-15',
          displayRange: '2026.07.01 - 2026.07.15 (15일)',
        }),
      );
      expect(pdfData.summary).toEqual(
        expect.objectContaining({
          bowelCount: 7,
          intervalAvg: 4.3,
          completionScore: 23.3,
        }),
      );
      expect(pdfData.dailyRows).toHaveLength(15);
      expect(result).toEqual({
        buffer: pdfBuffer,
        filename: 'boogle_report_202607.pdf',
      });
    });

    it('7일 미만 기록이면 REPORT_DATA_NOT_FOUND를 반환하고 렌더링하지 않는다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 6 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );

      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_DATA_NOT_FOUND,
      });
      expect(renderMonthlyPdfSpy).not.toHaveBeenCalled();
    });

    it('미래 월이면 REPORT_INVALID_DATE_RANGE를 반환하고 DB를 조회하지 않는다', async () => {
      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-08-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_INVALID_DATE_RANGE,
      });
      expect(prismaMock.boogleRecord.findMany).not.toHaveBeenCalled();
      expect(prismaMock.lifeRecord.findMany).not.toHaveBeenCalled();
      expect(renderMonthlyPdfSpy).not.toHaveBeenCalled();
    });

    it('월 시작일이 아니면 REPORT_INVALID_MONTH_FORMAT을 반환한다', async () => {
      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-02',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_INVALID_MONTH_FORMAT,
      });
    });

    it('renderer 오류를 REPORT_PDF_GENERATION_FAILED로 변환한다', async () => {
      prismaMock.boogleRecord.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, index) =>
          createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      );
      renderMonthlyPdfSpy.mockRejectedValueOnce(new Error('render failed'));

      await expect(
        service.createPdfReport(1n, {
          monthStartDate: '2026-07-01',
        }),
      ).rejects.toMatchObject({
        errorCode: ReportErrorCode.REPORT_PDF_GENERATION_FAILED,
      });
    });
  });

  describe('getMonthlyReport changeSummary', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-15T03:00:00.000Z'));

      prismaMock.weeklyRecord.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('현재 월은 충분하고 지난달 기록이 부족하면 비교 불가 사유를 반환한다', async () => {
      const currentRecords = Array.from({ length: 7 }, (_, index) =>
        createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
      );

      prismaMock.boogleRecord.findMany
        .mockResolvedValueOnce(currentRecords)
        .mockResolvedValueOnce([]);
      prismaMock.lifeRecord.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getMonthlyReport(1n, {
        monthStartDate: '2026-07-01',
        includePattern: false,
      });

      expect(result.dataStatus).toBe('ENOUGH');
      expect(result.previousSummary).toBeNull();
      expect(result.changeSummary).toEqual({
        compareType: 'PREVIOUS_MONTH',
        compareAvailable: false,
        reasonCode: 'PREVIOUS_MONTH_NOT_FOUND',
        bowelCountDiff: null,
        bowelCountChangeRate: null,
        intervalAvgDiff: null,
        completionScoreDiff: null,
        conditionScoreDiff: null,
        trend: 'NO_PREVIOUS_DATA',
        description: '비교할 지난달 기록이 아직 없어요.',
      });
    });

    it('현재 월 기록이 부족하면 changeSummary는 null이다', async () => {
      const currentRecords = Array.from({ length: 6 }, (_, index) =>
        createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
      );

      prismaMock.boogleRecord.findMany
        .mockResolvedValueOnce(currentRecords)
        .mockResolvedValueOnce([]);
      prismaMock.lifeRecord.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getMonthlyReport(1n, {
        monthStartDate: '2026-07-01',
        includePattern: false,
      });

      expect(result.dataStatus).toBe('INSUFFICIENT');
      expect(result.previousSummary).toBeNull();
      expect(result.changeSummary).toBeNull();
    });
  });
});
