import type {
  BoogleRecordForReport,
  DetectedRule,
  LifeRecordForReport,
  WeeklyPatternContext,
} from '../dto/report-record.dto';
import type { PatternEvidenceMetricDto } from '../dto/weekly-report-response.dto';
import { detectWeeklyPatterns } from './weekly-pattern.detector';
import {
  getWeeklyRuleDefinition,
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from './weekly-pattern.constants';

type BoogleOverrides = Partial<Omit<BoogleRecordForReport, 'id' | 'regDate'>>;
type LifeOverrides = Partial<Omit<LifeRecordForReport, 'id' | 'regDate'>>;

interface DetectOptions {
  boogleRecords?: BoogleRecordForReport[];
  lifeRecords?: LifeRecordForReport[];
  context?: WeeklyPatternContext;
}

let nextBoogleId = 1n;
let nextLifeId = 1n;

function createBoogleRecord(
  dateTime: string,
  overrides: BoogleOverrides = {},
): BoogleRecordForReport {
  const id = nextBoogleId;
  nextBoogleId += 1n;

  const regDate = new Date(dateTime);
  const {
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
  dateTime: string,
  overrides: LifeOverrides = {},
): LifeRecordForReport {
  const id = nextLifeId;
  nextLifeId += 1n;

  return {
    id,
    regDate: new Date(dateTime),
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

function detect(options: DetectOptions = {}): DetectedRule[] {
  return detectWeeklyPatterns({
    weekStartDate: new Date('2026-07-20T00:00:00.000Z'),
    weekEndDateExclusive: new Date('2026-07-27T00:00:00.000Z'),
    boogleRecords: options.boogleRecords ?? [],
    lifeRecords: options.lifeRecords ?? [],
    context: options.context ?? {
      previousMonthlyUserType: null,
      sensitiveInfoAgreed: false,
    },
  });
}

function getRuleCodes(rules: DetectedRule[]): WeeklyRuleCode[] {
  return rules.map((rule) => rule.ruleCode);
}

function requireRule(
  rules: DetectedRule[],
  ruleCode: WeeklyRuleCode,
): DetectedRule {
  const rule = rules.find((item) => item.ruleCode === ruleCode);

  if (rule === undefined) {
    throw new Error(`Expected rule was not detected: ${ruleCode}`);
  }

  return rule;
}

function requireEvidence(
  rule: DetectedRule,
  key: string,
): PatternEvidenceMetricDto {
  const evidence = (rule.card.evidence ?? []).find((item) => item.key === key);

  if (evidence === undefined) {
    throw new Error(`Expected evidence was not found: ${rule.ruleCode}/${key}`);
  }

  return evidence;
}

describe('weekly-pattern.detector', () => {
  beforeEach(() => {
    nextBoogleId = 1n;
    nextLifeId = 1n;
  });

  it('룰 20~24의 조건과 evidence를 함께 계산한다', () => {
    const targetDates = ['2026-07-20', '2026-07-21', '2026-07-22'];
    const boogleRecords = targetDates.map((date) =>
      createBoogleRecord(`${date}T08:00:00+09:00`, {
        stoolBristol: 2,
        stoolSimple: 'H',
        urgency: 'M',
        amount: 'S',
      }),
    );
    const lifeRecords = [
      ...targetDates.map((date) =>
        createLifeRecord(`${date}T09:00:00+09:00`, {
          caffeine: 'M',
          mealRegular: 'I',
        }),
      ),
      createLifeRecord('2026-07-23T09:00:00+09:00', {
        mealRegular: 'I',
      }),
    ];

    const result = detect({
      boogleRecords,
      lifeRecords,
    });
    const ruleCodes = getRuleCodes(result);

    expect(ruleCodes).toEqual(
      expect.arrayContaining([
        WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM,
        WEEKLY_RULE_CODE.REPEATED_URGENCY,
        WEEKLY_RULE_CODE.IRREGULAR_MEAL,
        WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT,
        WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE,
      ]),
    );

    const rule20 = requireRule(result, WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM);
    expect(requireEvidence(rule20, 'recordedBowelDays')).toEqual({
      key: 'recordedBowelDays',
      label: '배변 기록일',
      value: 3,
      threshold: 3,
      unit: 'DAY',
      comparison: 'GTE',
    });
    expect(requireEvidence(rule20, 'bowelIntervalStandardDeviation')).toEqual({
      key: 'bowelIntervalStandardDeviation',
      label: '배변 간격 편차',
      value: 0,
      threshold: 0.5,
      unit: 'DAY',
      comparison: 'LTE',
    });

    expect(
      requireEvidence(
        requireRule(result, WEEKLY_RULE_CODE.REPEATED_URGENCY),
        'urgencyCount',
      ).value,
    ).toBe(3);
    expect(
      requireEvidence(
        requireRule(result, WEEKLY_RULE_CODE.IRREGULAR_MEAL),
        'irregularMealDays',
      ).value,
    ).toBe(4);
    expect(
      requireEvidence(
        requireRule(result, WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT),
        'lowStoolAmountCount',
      ).value,
    ).toBe(3);
    expect(
      requireEvidence(
        requireRule(result, WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE),
        'caffeineWithStoolChangeDays',
      ).value,
    ).toBe(3);

    const orders = result.map(
      (rule) => getWeeklyRuleDefinition(rule.ruleCode).order,
    );
    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });

  it('배변 기록일이 3일 미만이면 룰 20을 감지하지 않는다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00'),
        createBoogleRecord('2026-07-22T08:00:00+09:00'),
        createBoogleRecord('2026-07-22T18:00:00+09:00'),
      ],
    });

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM,
    );
  });

  it('배변 간격 표준편차가 0.5를 초과하면 룰 20을 감지하지 않는다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00'),
        createBoogleRecord('2026-07-21T08:00:00+09:00'),
        createBoogleRecord('2026-07-25T08:00:00+09:00'),
      ],
    });

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM,
    );
  });

  it('배변 간격 표준편차가 정확히 0.5면 룰 20을 감지한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00'),
        createBoogleRecord('2026-07-21T08:00:00+09:00'),
        createBoogleRecord('2026-07-23T08:00:00+09:00'),
      ],
    });
    const rule20 = requireRule(result, WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM);

    expect(requireEvidence(rule20, 'bowelIntervalStandardDeviation')).toEqual({
      key: 'bowelIntervalStandardDeviation',
      label: '배변 간격 편차',
      value: 0.5,
      threshold: 0.5,
      unit: 'DAY',
      comparison: 'LTE',
    });
  });

  it('KST 주간 경계 안의 기록만 룰 20 계산에 사용한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-19T23:59:59+09:00'),
        createBoogleRecord('2026-07-20T00:00:00+09:00'),
        createBoogleRecord('2026-07-22T08:00:00+09:00'),
        createBoogleRecord('2026-07-24T08:00:00+09:00'),
        createBoogleRecord('2026-07-27T00:00:00+09:00'),
      ],
    });
    const rule20 = requireRule(result, WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM);

    expect(requireEvidence(rule20, 'recordedBowelDays').value).toBe(3);
  });

  it('룰 19는 bowelMovementAt의 KST 시간대를 사용한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T00:00:00.000Z', {
          bowelMovementAt: new Date('2026-07-20T11:30:00.000Z'),
        }),
      ],
    });

    const rule19 = requireRule(
      result,
      WEEKLY_RULE_CODE.BOWEL_TIME_SLOT_PATTERN,
    );

    // 실제 배변 시각 11:30Z = 20:30 KST
    expect(rule19.card.description).toBe(
      '평소 18시~23시에 배변이 가장 많았어요.',
    );
    expect(requireEvidence(rule19, 'frequentTimeSlotRatio').value).toBe(100);
  });

  it('이전 사용자 유형 C의 주간 저빈도 threshold를 적용한다', () => {
    const boogleRecords = [
      createBoogleRecord('2026-07-20T08:00:00+09:00'),
      createBoogleRecord('2026-07-22T08:00:00+09:00'),
    ];

    const defaultResult = detect({ boogleRecords });
    const constipationResult = detect({
      boogleRecords,
      context: {
        previousMonthlyUserType: 'C',
        sensitiveInfoAgreed: false,
      },
    });

    expect(getRuleCodes(defaultResult)).toContain(
      WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY,
    );
    expect(getRuleCodes(constipationResult)).not.toContain(
      WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY,
    );
  });

  it('이전 사용자 유형 L이면 룰 7 묽은 변 횟수 기준을 5회로 완화한다', () => {
    const boogleRecords = [
      '2026-07-20',
      '2026-07-22',
      '2026-07-24',
      '2026-07-26',
    ].map((date) =>
      createBoogleRecord(`${date}T08:00:00+09:00`, {
        stoolBristol: 6,
        stoolSimple: 'T',
      }),
    );

    const defaultResult = detect({
      boogleRecords,
    });
    const looseTypeResult = detect({
      boogleRecords,
      context: {
        previousMonthlyUserType: 'L',
        sensitiveInfoAgreed: false,
      },
    });

    expect(getRuleCodes(defaultResult)).toContain(
      WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL,
    );
    expect(getRuleCodes(looseTypeResult)).not.toContain(
      WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL,
    );
  });

  it('이전 사용자 유형 L이면 룰 8 연속 묽은 변 기준을 5일로 완화한다', () => {
    const fourDayRecords = [
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
    ].map((date) =>
      createBoogleRecord(`${date}T08:00:00+09:00`, {
        stoolBristol: 6,
        stoolSimple: 'T',
      }),
    );
    const fiveDayRecords = [
      ...fourDayRecords,
      createBoogleRecord('2026-07-24T08:00:00+09:00', {
        stoolBristol: 6,
        stoolSimple: 'T',
      }),
    ];
    const looseTypeContext: WeeklyPatternContext = {
      previousMonthlyUserType: 'L',
      sensitiveInfoAgreed: false,
    };

    const defaultFourDayResult = detect({
      boogleRecords: fourDayRecords,
    });
    const looseTypeFourDayResult = detect({
      boogleRecords: fourDayRecords,
      context: looseTypeContext,
    });
    const looseTypeFiveDayResult = detect({
      boogleRecords: fiveDayRecords,
      context: looseTypeContext,
    });

    expect(getRuleCodes(defaultFourDayResult)).toContain(
      WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    );
    expect(getRuleCodes(looseTypeFourDayResult)).not.toContain(
      WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    );
    expect(getRuleCodes(looseTypeFiveDayResult)).toContain(
      WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    );

    const rule = requireRule(
      looseTypeFiveDayResult,
      WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    );

    expect(requireEvidence(rule, 'looseStoolStreakDays')).toMatchObject({
      value: 5,
      threshold: 5,
      unit: 'DAY',
    });
  });

  it('민감정보 동의가 있을 때만 호르몬 룰을 감지한다', () => {
    const boogleRecords = [
      createBoogleRecord('2026-07-20T08:00:00+09:00', {
        stoolBristol: 2,
        stoolSimple: 'H',
      }),
    ];
    const lifeRecords = [
      createLifeRecord('2026-07-20T09:00:00+09:00', {
        hormone: 'M',
      }),
    ];

    const disagreedResult = detect({
      boogleRecords,
      lifeRecords,
    });
    const agreedResult = detect({
      boogleRecords,
      lifeRecords,
      context: {
        previousMonthlyUserType: null,
        sensitiveInfoAgreed: true,
      },
    });

    expect(getRuleCodes(disagreedResult)).not.toContain(
      WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE,
    );
    expect(getRuleCodes(agreedResult)).toContain(
      WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE,
    );
  });

  it('연속 묽은 변 룰이 감지되면 일반 묽은 변 룰을 제거한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          stoolBristol: 6,
          stoolSimple: 'T',
        }),
        createBoogleRecord('2026-07-21T08:00:00+09:00', {
          stoolBristol: 6,
          stoolSimple: 'T',
        }),
        createBoogleRecord('2026-07-22T08:00:00+09:00', {
          stoolBristol: 6,
          stoolSimple: 'T',
        }),
      ],
    });
    const ruleCodes = getRuleCodes(result);

    expect(ruleCodes).toContain(WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL);
    expect(ruleCodes).not.toContain(WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL);
  });

  it('무배변과 복통 룰이 감지되면 단순 장기 무배변 룰을 제거한다', () => {
    const dates = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'];
    const boogleRecords = dates.map((date, index) =>
      createBoogleRecord(`${date}T08:00:00+09:00`, {
        hasBowel: false,
        stoolBristol: null,
        stoolSimple: null,
        stomach: index === 0 ? 1 : null,
      }),
    );

    const result = detect({ boogleRecords });
    const ruleCodes = getRuleCodes(result);

    expect(ruleCodes).toContain(WEEKLY_RULE_CODE.NO_BOWEL_WITH_PAIN);
    expect(ruleCodes).not.toContain(WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL);
  });

  it('최근 30일 부글 기록이 없으면 룰 3을 감지하지 않는다', () => {
    const result = detect();

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY_30D,
    );
  });

  it('최근 30일 부글 기록일이 3일 미만이면 룰 3을 감지하지 않는다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          hasBowel: false,
          stoolBristol: null,
          stoolSimple: null,
        }),
        createBoogleRecord('2026-07-21T08:00:00+09:00', {
          hasBowel: false,
          stoolBristol: null,
          stoolSimple: null,
        }),
      ],
    });

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY_30D,
    );
  });

  it('최근 30일 부글 기록일이 3일 이상이고 배변 횟수가 기준 미만이면 룰 3을 감지한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          hasBowel: false,
          stoolBristol: null,
          stoolSimple: null,
        }),
        createBoogleRecord('2026-07-21T08:00:00+09:00', {
          hasBowel: false,
          stoolBristol: null,
          stoolSimple: null,
        }),
        createBoogleRecord('2026-07-22T08:00:00+09:00', {
          hasBowel: true,
        }),
      ],
    });

    expect(getRuleCodes(result)).toContain(
      WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY_30D,
    );
  });

  it('룰 5는 연속 무배변 중 stomach가 0이면 감지하지 않는다', () => {
    const dates = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'];
    const result = detect({
      boogleRecords: dates.map((date, index) =>
        createBoogleRecord(`${date}T08:00:00+09:00`, {
          hasBowel: false,
          stoolBristol: null,
          stoolSimple: null,
          stomach: index === 0 ? 0 : null,
        }),
      ),
    });
    const ruleCodes = getRuleCodes(result);

    expect(ruleCodes).not.toContain(WEEKLY_RULE_CODE.NO_BOWEL_WITH_PAIN);
    expect(ruleCodes).toContain(WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL);
  });

  it('룰 9는 stomach 2가 두 번이어도 감지하지 않는다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          stomach: 2,
        }),
        createBoogleRecord('2026-07-21T08:00:00+09:00', {
          stomach: 2,
        }),
      ],
    });

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.REPEATED_SEVERE_PAIN,
    );
  });

  it('룰 9는 stomach 3 이상이 두 번이면 감지한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          stomach: 3,
        }),
        createBoogleRecord('2026-07-21T08:00:00+09:00', {
          stomach: 4,
        }),
      ],
    });

    expect(getRuleCodes(result)).toContain(
      WEEKLY_RULE_CODE.REPEATED_SEVERE_PAIN,
    );
  });

  it('룰 15는 같은 KST 날짜의 높은 스트레스와 stomach 1부터 감지한다', () => {
    const dates = ['2026-07-20', '2026-07-21'];
    const lifeRecords = dates.map((date) =>
      createLifeRecord(`${date}T09:00:00+09:00`, {
        stress: 'H',
      }),
    );

    const withPain = detect({
      boogleRecords: dates.map((date) =>
        createBoogleRecord(`${date}T08:00:00+09:00`, {
          stomach: 1,
        }),
      ),
      lifeRecords,
    });
    const withoutPain = detect({
      boogleRecords: dates.map((date) =>
        createBoogleRecord(`${date}T08:00:00+09:00`, {
          stomach: 0,
        }),
      ),
      lifeRecords,
    });

    expect(getRuleCodes(withPain)).toContain(WEEKLY_RULE_CODE.STRESS_WITH_PAIN);
    expect(getRuleCodes(withoutPain)).not.toContain(
      WEEKLY_RULE_CODE.STRESS_WITH_PAIN,
    );
  });

  it('룰 19는 bowelMovementAt이 없는 배변 기록을 시간대 계산에서 제외한다', () => {
    const result = detect({
      boogleRecords: [
        createBoogleRecord('2026-07-20T08:00:00+09:00', {
          bowelMovementAt: null,
        }),
      ],
    });

    expect(getRuleCodes(result)).not.toContain(
      WEEKLY_RULE_CODE.BOWEL_TIME_SLOT_PATTERN,
    );
  });
});
