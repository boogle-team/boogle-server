import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationDispatchService } from '@/notification/notification-dispatch.service';
import { ReportService } from './report.service';
import { ReportSnapshotService } from './report-snapshot.service';
import { ReportErrorCode } from './report-error-code.enum';
import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from './dto/report-record.dto';
import type {
  MonthlyUserTypeDto,
  PreviousMonthlySummaryDto,
} from './dto/monthly-report-response.dto';
import * as monthlyPdfRenderer from './pdf/monthly-pdf.renderer';
import type {
  ChangeTrend,
  FrequentTimeSlotDto,
  WeeklyGuideDto,
  BowelRhythmByDayDto,
  PreviousWeeklySummaryDto,
} from './dto/weekly-report-response.dto';
import {
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from './pattern/weekly-pattern.constants';

const notificationDispatchMock = {
  dispatch: jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined),
};

const reportSnapshotMock = {
  findFinalizedWeekly: jest.fn(),
  upsertWeekly: jest.fn(),
  findFinalizedMonthly: jest.fn(),
  upsertMonthly: jest.fn(),
};

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

interface MonthlyUserTypeTestAccessor {
  resolveMonthlyUserType(
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
  ): MonthlyUserTypeDto;
}

interface ReportSnapshotTestAccessor {
  getOrCreatePreviousWeeklySummary(
    userId: bigint,
    previousWeekStartDate: Date,
    previousWeekEndDate: Date,
    previousBoogleRecords: BoogleRecordForReport[],
    previousLifeRecords: LifeRecordForReport[],
  ): Promise<PreviousWeeklySummaryDto | null>;

  getOrCreatePreviousMonthlySummary(
    userId: bigint,
    previousMonthStartDate: Date,
    previousMonthEndDate: Date,
    previousBoogleRecords: BoogleRecordForReport[],
    previousLifeRecords: LifeRecordForReport[],
  ): Promise<PreviousMonthlySummaryDto | null>;
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

function createLifeRecord(
  dateKey: string,
  overrides: Partial<LifeRecordForReport> = {},
): LifeRecordForReport {
  return {
    id: BigInt(dateKey.slice(-2)),
    regDate: kstDate(dateKey),
    sleep: null,
    sleepTime: null,
    caffeine: null,
    exercise: null,
    stress: null,
    water: null,
    waterIntake: null,
    mealRegular: null,
    hormone: null,
    foodTags: [],
    ...overrides,
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
    guide: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    reportSnapshotMock.findFinalizedWeekly.mockReset().mockResolvedValue(null);
    reportSnapshotMock.upsertWeekly.mockReset().mockResolvedValue(undefined);
    reportSnapshotMock.findFinalizedMonthly.mockReset().mockResolvedValue(null);
    reportSnapshotMock.upsertMonthly.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: NotificationDispatchService,
          useValue: notificationDispatchMock,
        },
        {
          provide: ReportSnapshotService,
          useValue: reportSnapshotMock,
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

  describe('report snapshot cache', () => {
    const getSnapshotAccessor = (): ReportSnapshotTestAccessor =>
      service as unknown as ReportSnapshotTestAccessor;

    it('확정된 이전 주 캐시가 있으면 previousSummary에 캐시 값을 사용한다', async () => {
      reportSnapshotMock.findFinalizedWeekly.mockResolvedValueOnce({
        bowelCount: 5,
        intervalAvg: 1.4,
        completionScore: 71.4,
        recordedDays: 5,
      });

      const result =
        await getSnapshotAccessor().getOrCreatePreviousWeeklySummary(
          1n,
          calendarDate('2026-07-13'),
          calendarDate('2026-07-19'),
          [createBoogleRecord('2026-07-13')],
          [createLifeRecord('2026-07-13')],
        );

      expect(result).toEqual({
        period: {
          type: 'WEEKLY',
          startDate: '2026-07-13',
          endDate: '2026-07-19',
        },
        bowelCount: 5,
        intervalAvg: 1.4,
        completionScore: 71.4,
      });
      expect(reportSnapshotMock.upsertWeekly).not.toHaveBeenCalled();
    });
    it('이전 주 캐시의 recordedDays가 0이면 previousSummary는 null이다', async () => {
      reportSnapshotMock.findFinalizedWeekly.mockResolvedValueOnce({
        bowelCount: 0,
        intervalAvg: 0,
        completionScore: 0,
        recordedDays: 0,
      });

      const result =
        await getSnapshotAccessor().getOrCreatePreviousWeeklySummary(
          1n,
          calendarDate('2026-07-13'),
          calendarDate('2026-07-19'),
          [createBoogleRecord('2026-07-13')],
          [],
        );

      expect(result).toBeNull();
      expect(reportSnapshotMock.upsertWeekly).not.toHaveBeenCalled();
    });
    it('확정된 이전 월 캐시가 있으면 previousSummary에 캐시 값을 사용한다', async () => {
      reportSnapshotMock.findFinalizedMonthly.mockResolvedValueOnce({
        bowelCount: 15,
        bowelDays: 12,
        intervalAvg: 2,
        state: 2,
        completionScore: 66.7,
        rhythmScore: 65,
        stateScore: 58,
        conditionScore: 63,
        userType: 'I',
        recordedDays: 20,
      });

      const result =
        await getSnapshotAccessor().getOrCreatePreviousMonthlySummary(
          1n,
          calendarDate('2026-06-01'),
          calendarDate('2026-06-30'),
          [],
          [],
        );

      expect(result).toEqual({
        period: {
          type: 'MONTHLY',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
        bowelCount: 15,
        bowelDays: 12,
        intervalAvg: 2,
        completionScore: 66.7,
        rhythmScore: 65,
        stateScore: 58,
        conditionScore: 63,
        state: 2,
        stateLabel: '보통',
        userType: 'I',
        userTypeLabel: '불규칙형',
      });
      expect(reportSnapshotMock.upsertMonthly).not.toHaveBeenCalled();
    });
    it('이전 월 캐시의 recordedDays가 7일 미만이면 previousSummary는 null이다', async () => {
      reportSnapshotMock.findFinalizedMonthly.mockResolvedValueOnce({
        bowelCount: 4,
        bowelDays: 4,
        intervalAvg: 7.5,
        state: 3,
        completionScore: 20,
        rhythmScore: 50,
        stateScore: 50,
        conditionScore: 50,
        userType: 'N',
        recordedDays: 6,
      });

      const result =
        await getSnapshotAccessor().getOrCreatePreviousMonthlySummary(
          1n,
          calendarDate('2026-06-01'),
          calendarDate('2026-06-30'),
          [createBoogleRecord('2026-06-01')],
          [],
        );

      expect(result).toBeNull();
      expect(reportSnapshotMock.upsertMonthly).not.toHaveBeenCalled();
    });
  });

  describe('weekly snapshot finalization', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-22T03:00:00.000Z'));

      prismaMock.boogleRecord.findMany.mockResolvedValue([]);
      prismaMock.lifeRecord.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('현재 주 스냅샷은 오늘까지 계산하고 isFinalized=false로 저장한다', async () => {
      await service.getWeeklyReport(1n, {
        weekStartDate: '2026-07-20',
        includeGuide: false,
      });

      expect(reportSnapshotMock.upsertWeekly).toHaveBeenCalledWith(
        1n,
        calendarDate('2026-07-20'),
        calendarDate('2026-07-22'),
        false,
        expect.objectContaining({
          recordedDays: 0,
        }),
      );
    });

    it('과거 주 스냅샷은 일요일까지 계산하고 isFinalized=true로 저장한다', async () => {
      await service.getWeeklyReport(1n, {
        weekStartDate: '2026-07-06',
        includeGuide: false,
      });

      expect(reportSnapshotMock.upsertWeekly).toHaveBeenCalledWith(
        1n,
        calendarDate('2026-07-06'),
        calendarDate('2026-07-12'),
        true,
        expect.objectContaining({
          recordedDays: 0,
        }),
      );
    });
  });

  describe('snapshot write failure fallback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-22T03:00:00.000Z'));

      prismaMock.boogleRecord.findMany.mockResolvedValue([]);
      prismaMock.lifeRecord.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('현재 주 스냅샷 저장이 실패해도 원본 계산 리포트를 반환한다', async () => {
      reportSnapshotMock.upsertWeekly
        .mockRejectedValueOnce(new Error('weekly snapshot unavailable'))
        .mockResolvedValueOnce(undefined);

      const result = await service.getWeeklyReport(1n, {
        weekStartDate: '2026-07-20',
        includeGuide: false,
      });

      expect(result).toMatchObject({
        dataStatus: 'INSUFFICIENT',
        recordStats: {
          recordedDays: 0,
        },
      });
      expect(reportSnapshotMock.upsertWeekly).toHaveBeenCalled();
    });

    it('이전 주 fallback 저장이 실패해도 계산한 previousSummary를 반환한다', async () => {
      reportSnapshotMock.findFinalizedWeekly.mockResolvedValueOnce(null);
      reportSnapshotMock.upsertWeekly.mockRejectedValueOnce(
        new Error('weekly snapshot unavailable'),
      );

      const result = await (
        service as unknown as ReportSnapshotTestAccessor
      ).getOrCreatePreviousWeeklySummary(
        1n,
        calendarDate('2026-07-13'),
        calendarDate('2026-07-19'),
        [createBoogleRecord('2026-07-13')],
        [],
      );

      expect(result).toEqual({
        period: {
          type: 'WEEKLY',
          startDate: '2026-07-13',
          endDate: '2026-07-19',
        },
        bowelCount: 1,
        intervalAvg: 7,
        completionScore: 14.3,
      });
    });
    it('현재 월 스냅샷 저장이 실패해도 원본 계산 리포트를 반환한다', async () => {
      reportSnapshotMock.upsertMonthly.mockRejectedValueOnce(
        new Error('monthly snapshot unavailable'),
      );

      const currentRecords = Array.from({ length: 6 }, (_, index) =>
        createBoogleRecord(`2026-07-${String(index + 1).padStart(2, '0')}`),
      );

      prismaMock.boogleRecord.findMany.mockResolvedValueOnce(currentRecords);
      prismaMock.lifeRecord.findMany.mockResolvedValueOnce([]);

      const result = await service.getMonthlyReport(1n, {
        monthStartDate: '2026-07-01',
        includePattern: false,
      });

      expect(result).toMatchObject({
        dataStatus: 'INSUFFICIENT',
        recordStats: {
          recordedDays: 6,
        },
      });
    });
    it('이전 월 fallback 저장이 실패해도 계산한 previousSummary를 반환한다', async () => {
      reportSnapshotMock.findFinalizedMonthly.mockResolvedValueOnce(null);
      reportSnapshotMock.upsertMonthly.mockRejectedValueOnce(
        new Error('monthly snapshot unavailable'),
      );

      const previousRecords = Array.from({ length: 7 }, (_, index) =>
        createBoogleRecord(`2026-06-${String(index + 1).padStart(2, '0')}`),
      );

      const result = await (
        service as unknown as ReportSnapshotTestAccessor
      ).getOrCreatePreviousMonthlySummary(
        1n,
        calendarDate('2026-06-01'),
        calendarDate('2026-06-30'),
        previousRecords,
        [],
      );

      expect(result).not.toBeNull();
      expect(result?.period).toEqual({
        type: 'MONTHLY',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });
      expect(result?.bowelCount).toBe(7);
    });
  });

  describe('resolveMonthlyUserType', () => {
    const getAccessor = () => service as unknown as MonthlyUserTypeTestAccessor;

    type MonthlyBowelFixture = readonly [
      dateKey: string,
      time: string,
      stoolBristol: number | null,
    ];

    const createMonthlyRecords = (
      fixtures: readonly MonthlyBowelFixture[],
    ): BoogleRecordForReport[] =>
      fixtures.map(([dateKey, time, stoolBristol], index) =>
        createBoogleRecord(dateKey, {
          id: BigInt(index + 1),
          bowelMovementAt: kstDate(dateKey, time),
          stoolBristol,
          stoolSimple: null,
        }),
      );

    it('월 누적 배변이 5회 미만이면 유형 분석 중을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 3],
        ['2026-08-02', '09:00', 4],
        ['2026-08-03', '09:00', 3],
        ['2026-08-04', '09:00', 4],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'N',
        name: '유형 분석 중',
        title: '아직 뚜렷한 유형이 나타나지 않았어요',
        description: null,
      });
    });

    it('실제 최대 배변 간격이 3일 미만이면 표시값이 3.0일이어도 C로 판정하지 않는다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '00:00', 5],
        ['2026-08-01', '12:00', 5],
        ['2026-08-04', '11:00', 5], // 이전 기록과 2일 23시간
        ['2026-08-05', '11:00', 5],
        ['2026-08-06', '11:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, []).code).toBe('I');
    });

    it('배변 5회 중 브리스톨 3~4가 60%이면 규칙형을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 3],
        ['2026-08-02', '09:00', 4],
        ['2026-08-03', '09:00', 3],
        ['2026-08-04', '09:00', 5],
        ['2026-08-05', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'R',
        name: '규칙형',
        title: '이번 달 배변 5회 + 보통 변 60%',
        description: '비교적 일정한 배변 패턴이 나타났어요',
      });
    });

    it('브리스톨 1~2 비율이 40%이면 변비경향형을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 1],
        ['2026-08-02', '09:00', 2],
        ['2026-08-03', '09:00', 3],
        ['2026-08-04', '09:00', 4],
        ['2026-08-05', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'C',
        name: '변비경향형',
        title: '딱딱한 변 40%',
        description:
          '딱딱한 변이 자주 기록되거나 배변 간격이 길어진 구간이 있었어요',
      });
    });

    it('딱딱한 변 비율이 낮아도 최대 배변 간격이 3일이면 변비경향형을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 5],
        ['2026-08-02', '09:00', 5],
        ['2026-08-05', '09:00', 5],
        ['2026-08-06', '09:00', 5],
        ['2026-08-07', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'C',
        name: '변비경향형',
        title: '최대 배변 간격 3일',
        description:
          '딱딱한 변이 자주 기록되거나 배변 간격이 길어진 구간이 있었어요',
      });
    });

    it('변비경향형의 두 조건을 모두 만족하면 title에 두 계산값을 표시한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 1],
        ['2026-08-02', '09:00', 2],
        ['2026-08-05', '09:00', 5],
        ['2026-08-06', '09:00', 5],
        ['2026-08-07', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'C',
        name: '변비경향형',
        title: '최대 배변 간격 3일 또는 딱딱한 변 40%',
        description:
          '딱딱한 변이 자주 기록되거나 배변 간격이 길어진 구간이 있었어요',
      });
    });

    it('브리스톨 6~7 비율이 40%이면 묽은변경향형을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 6],
        ['2026-08-02', '09:00', 7],
        ['2026-08-03', '09:00', 5],
        ['2026-08-04', '09:00', 5],
        ['2026-08-05', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'W',
        name: '묽은변경향형',
        title: '묽은 변 40%',
        description: '묽은 변이 비교적 자주 기록됐어요',
      });
    });

    it('변비경향형과 묽은변경향형을 동시에 만족하면 유형 분석 중을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 1],
        ['2026-08-02', '09:00', 2],
        ['2026-08-03', '09:00', 6],
        ['2026-08-04', '09:00', 7],
        ['2026-08-05', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'N',
        name: '유형 분석 중',
        title: '아직 뚜렷한 유형이 나타나지 않았어요',
        description: null,
      });
    });

    it('최대 간격은 3일 미만이지만 최대와 최소 간격 차이가 2일 이상이면 불규칙형을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '00:00', 5],
        ['2026-08-01', '06:00', 5],
        ['2026-08-03', '18:00', 5],
        ['2026-08-04', '18:00', 5],
        ['2026-08-05', '18:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'I',
        name: '불규칙형',
        title: '배변 간격 0.3일 ~ 2.5일',
        description: '배변 간격이 일정하지 않고 들쭉날쭉했어요',
      });
    });

    it('이상 변과 생활 이상이 같은 날짜에 2일 있고 규칙형도 만족하면 생활영향형을 우선한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 1],
        ['2026-08-02', '09:00', 6],
        ['2026-08-03', '09:00', 3],
        ['2026-08-04', '09:00', 4],
        ['2026-08-05', '09:00', 3],
      ]);
      const lifeRecords = [
        createLifeRecord('2026-08-01', { water: 'L' }),
        createLifeRecord('2026-08-02', { water: 'L' }),
      ];

      expect(
        getAccessor().resolveMonthlyUserType(records, lifeRecords),
      ).toEqual({
        code: 'L',
        name: '생활영향형',
        title: '수분 부족이 나타난 날에 평소와 다른 변 상태가 함께 나타났어요',
        description: null,
      });
    });

    it('배변은 5회 이상이지만 어떤 유형 조건도 만족하지 않으면 유형 분석 중을 반환한다', () => {
      const records = createMonthlyRecords([
        ['2026-08-01', '09:00', 5],
        ['2026-08-02', '09:00', 5],
        ['2026-08-03', '09:00', 5],
        ['2026-08-04', '09:00', 5],
        ['2026-08-05', '09:00', 5],
      ]);

      expect(getAccessor().resolveMonthlyUserType(records, [])).toEqual({
        code: 'N',
        name: '유형 분석 중',
        title: '아직 뚜렷한 유형이 나타나지 않았어요',
        description: null,
      });
    });
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

    it.each(['', '2026-7-01', '2026-07-02', '2026-13-01', 'invalid'])(
      'PDF 월 시작일 %s는 REPORT_INVALID_MONTH_FORMAT을 반환한다',
      async (monthStartDate) => {
        await expect(
          service.createPdfReport(1n, { monthStartDate }),
        ).rejects.toMatchObject({
          errorCode: ReportErrorCode.REPORT_INVALID_MONTH_FORMAT,
        });
      },
    );

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
