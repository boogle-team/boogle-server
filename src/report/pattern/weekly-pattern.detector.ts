import type {
  BoogleRecordForReport,
  DetectedRule,
  LifeRecordForReport,
  WeeklyPatternContext,
} from '../dto/report-record.dto';
import {
  getWeeklyRuleDefinition,
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from './weekly-pattern.constants';
import {
  addUtcDays,
  isInKstCalendarRange,
  longestConsecutiveDays,
  splitConsecutiveDateKeys,
  standardDeviation,
  toDateKey,
  uniqueDateKeys,
} from './pattern-date.util';
import type { PatternCardDto } from '../dto/weekly-report-response.dto';
import { getKstHour } from '@/common/utils/kst-date.util';

const RULE_20_MAX_INTERVAL_STANDARD_DEVIATION = 0.5;
const LOW_BOWEL_30D_MIN_OBSERVED_DAYS = 3;

interface DetectWeeklyPatternsInput {
  // KST 달력 날짜를 UTC 자정 Date에 담은 운반값이다.
  weekStartDate: Date;
  weekEndDateExclusive: Date;
  boogleRecords: BoogleRecordForReport[];
  lifeRecords: LifeRecordForReport[];
  context: WeeklyPatternContext;
}

interface TimeSlotResult {
  slot: 'NIGHT' | 'MORNING' | 'AFTERNOON' | 'EVENING';
  label: string;
  count: number;
  ratio: number;
}

export function detectWeeklyPatterns(
  input: DetectWeeklyPatternsInput,
): DetectedRule[] {
  const weekBoogleRecords = input.boogleRecords.filter((record) =>
    isInKstCalendarRange(
      record.regDate,
      input.weekStartDate,
      input.weekEndDateExclusive,
    ),
  );
  const weekLifeRecords = input.lifeRecords.filter((record) =>
    isInKstCalendarRange(
      record.regDate,
      input.weekStartDate,
      input.weekEndDateExclusive,
    ),
  );

  const lookback14Start = addUtcDays(input.weekEndDateExclusive, -14);
  const lookback30Start = addUtcDays(input.weekEndDateExclusive, -30);

  const boogleRecords14 = input.boogleRecords.filter((record) =>
    isInKstCalendarRange(
      record.regDate,
      lookback14Start,
      input.weekEndDateExclusive,
    ),
  );
  const boogleRecords30 = input.boogleRecords.filter((record) =>
    isInKstCalendarRange(
      record.regDate,
      lookback30Start,
      input.weekEndDateExclusive,
    ),
  );

  const detected = new Map<WeeklyRuleCode, DetectedRule>();

  const addRule = (
    ruleCode: WeeklyRuleCode,
    options?: {
      descriptionOverride?: string;
      evidence?: PatternCardDto['evidence'];
    },
  ): void => {
    const definition = getWeeklyRuleDefinition(ruleCode);

    detected.set(ruleCode, {
      ruleCode,
      card: {
        level: definition.level,
        ruleCode,
        title: definition.title,
        description: options?.descriptionOverride ?? definition.description,
        evidence: options?.evidence ?? [],
      },
    });
  };
  const previousType = input.context.previousMonthlyUserType;
  const weekBowelRecords = weekBoogleRecords.filter(
    (record) => record.hasBowel,
  );
  const bowelRecords30 = boogleRecords30.filter((record) => record.hasBowel);

  // 룰 1
  const lowBowelThreshold = previousType === 'C' ? 1 : 2;
  if (weekBowelRecords.length <= lowBowelThreshold) {
    addRule(WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY);
  }

  // 룰 2
  if (weekBowelRecords.length >= 14) {
    addRule(WEEKLY_RULE_CODE.HIGH_BOWEL_FREQUENCY);
  }

  // 룰 3
  const observedBoogleDays30 = uniqueDateKeys(
    boogleRecords30.map((record) => record.regDate),
  ).length;
  const lowBowel30Threshold = previousType === 'C' ? 8 : 12;

  if (
    observedBoogleDays30 >= LOW_BOWEL_30D_MIN_OBSERVED_DAYS &&
    bowelRecords30.length < lowBowel30Threshold
  ) {
    addRule(WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY_30D);
  }

  const noBowelDateKeys = getExplicitNoBowelDateKeys(weekBoogleRecords);
  const noBowelStreakGroups = splitConsecutiveDateKeys(noBowelDateKeys);
  const longestNoBowelDays = noBowelStreakGroups.reduce(
    (max, group) => Math.max(max, group.length),
    0,
  );

  // 룰 4
  const noBowelIntervalThreshold = previousType === 'C' ? 5 : 3;
  if (longestNoBowelDays >= noBowelIntervalThreshold) {
    addRule(WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL, {
      evidence: [
        {
          key: 'longestNoBowelDays',
          label: '연속 무배변 일수',
          value: longestNoBowelDays,
          threshold: noBowelIntervalThreshold,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 5
  const hasNoBowelWithPain = noBowelStreakGroups.some((group) => {
    if (group.length < 4) {
      return false;
    }

    const groupDateSet = new Set(group);

    return weekBoogleRecords.some(
      (record) =>
        !record.hasBowel &&
        groupDateSet.has(toDateKey(record.regDate)) &&
        isPainAtLeastMild(record.stomach),
    );
  });

  if (hasNoBowelWithPain) {
    addRule(WEEKLY_RULE_CODE.NO_BOWEL_WITH_PAIN);
  }

  const validStoolRecords = weekBowelRecords.filter((record) =>
    isValidStoolSimple(record.stoolSimple),
  );
  const hardStoolRecords = validStoolRecords.filter(
    (record) => record.stoolSimple === 'H',
  );
  const looseStoolRecords = validStoolRecords.filter(
    (record) => record.stoolSimple === 'T',
  );
  const hardStoolRatio =
    validStoolRecords.length === 0
      ? 0
      : (hardStoolRecords.length / validStoolRecords.length) * 100;

  // 룰 6
  if (hardStoolRatio >= 50) {
    addRule(WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY);
  }

  // 룰 7
  const looseCountThreshold = previousType === 'L' ? 5 : 3;
  if (looseStoolRecords.length >= looseCountThreshold) {
    addRule(WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL, {
      evidence: [
        {
          key: 'looseStoolCount',
          label: '묽은 변 횟수',
          value: looseStoolRecords.length,
          threshold: looseCountThreshold,
          unit: 'COUNT',
        },
      ],
    });
  }

  // 룰 8
  const looseStoolDateKeys = uniqueDateKeys(
    looseStoolRecords.map((record) => record.regDate),
  );
  const looseStreakThreshold = previousType === 'L' ? 5 : 3;
  const looseStoolStreakDays = longestConsecutiveDays(looseStoolDateKeys);

  if (looseStoolStreakDays >= looseStreakThreshold) {
    addRule(WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL, {
      evidence: [
        {
          key: 'looseStoolStreakDays',
          label: '묽은 변 연속 일수',
          value: looseStoolStreakDays,
          threshold: looseStreakThreshold,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 9
  const severePainCount = weekBoogleRecords.filter(
    (record) => record.stomach === 'L',
  ).length;
  if (severePainCount >= 2) {
    addRule(WEEKLY_RULE_CODE.REPEATED_SEVERE_PAIN);
  }

  // 룰 10
  const looseStoolDateKeys30 = uniqueDateKeys(
    bowelRecords30
      .filter((record) => record.stoolSimple === 'T')
      .map((record) => record.regDate),
  );
  if (longestConsecutiveDays(looseStoolDateKeys30) >= 14) {
    addRule(WEEKLY_RULE_CODE.LONG_TERM_LOOSE_STOOL);
  }

  // 룰 11
  const severeDistensionCount = weekBoogleRecords.filter(
    (record) => record.distension === 'L',
  ).length;

  if (severeDistensionCount >= 2) {
    addRule(WEEKLY_RULE_CODE.REPEATED_DISTENSION, {
      evidence: [
        {
          key: 'severeDistensionCount',
          label: '심한 복부 팽만 횟수',
          value: severeDistensionCount,
          threshold: 2,
          unit: 'COUNT',
        },
      ],
    });
  }

  // 룰 12
  const remainingFeelingCount = weekBoogleRecords.filter((record) =>
    isSymptomPresent(record.remainingFeeling),
  ).length;

  if (remainingFeelingCount >= 3) {
    addRule(WEEKLY_RULE_CODE.REPEATED_REMAINING_FEELING, {
      evidence: [
        {
          key: 'remainingFeelingCount',
          label: '잔변감 횟수',
          value: remainingFeelingCount,
          threshold: 3,
          unit: 'COUNT',
        },
      ],
    });
  }

  // 룰 13
  const prolongedBowelCount = weekBowelRecords.filter(
    (record) =>
      record.bowelFeeling === 'H' &&
      record.takenTime !== null &&
      record.takenTime >= 15,
  ).length;

  if (prolongedBowelCount >= 2) {
    addRule(WEEKLY_RULE_CODE.PROLONGED_BOWEL_TIME, {
      evidence: [
        {
          key: 'prolongedBowelCount',
          label: '힘들고 15분 이상 걸린 배변 횟수',
          value: prolongedBowelCount,
          threshold: 2,
          unit: 'COUNT',
        },
      ],
    });
  }
  // 룰 14
  const weekBoogleByDate = groupBoogleRecordsByDate(weekBoogleRecords);
  const lowWaterWithHardStoolDays = weekLifeRecords.filter((lifeRecord) => {
    if (!isLowWaterRecord(lifeRecord)) {
      return false;
    }

    return (weekBoogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) =>
        boogleRecord.hasBowel && boogleRecord.stoolSimple === 'H',
    );
  }).length;

  if (lowWaterWithHardStoolDays >= 3) {
    addRule(WEEKLY_RULE_CODE.LOW_WATER_WITH_HARD_STOOL, {
      evidence: [
        {
          key: 'lowWaterWithHardStoolDays',
          label: '수분 부족과 딱딱한 변이 함께 기록된 날',
          value: lowWaterWithHardStoolDays,
          threshold: 3,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 15
  const stressWithPainDays = weekLifeRecords.filter((lifeRecord) => {
    if (lifeRecord.stress !== 'H') {
      return false;
    }

    return (weekBoogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) => isPainAtLeastMild(boogleRecord.stomach),
    );
  }).length;

  if (stressWithPainDays >= 2) {
    addRule(WEEKLY_RULE_CODE.STRESS_WITH_PAIN);
  }

  // 룰 16
  const foodWithLooseStoolDays = weekLifeRecords.filter((lifeRecord) => {
    const hasTargetFood = lifeRecord.foodTags.some(
      ({ food }) => food.name === '음주' || food.name === '야식',
    );

    if (!hasTargetFood) {
      return false;
    }

    return (weekBoogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) =>
        boogleRecord.hasBowel && boogleRecord.stoolSimple === 'T',
    );
  }).length;

  if (foodWithLooseStoolDays >= 1) {
    addRule(WEEKLY_RULE_CODE.FOOD_WITH_LOOSE_STOOL, {
      evidence: [
        {
          key: 'foodWithLooseStoolDays',
          label: '음주·야식과 묽은 변이 함께 기록된 날',
          value: foodWithLooseStoolDays,
          threshold: 1,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 17
  const lowSleepDateKeys = uniqueDateKeys(
    weekLifeRecords
      .filter((record) => record.sleep === 'B')
      .map((record) => record.regDate),
  );
  const lowSleepStreakDays = longestConsecutiveDays(lowSleepDateKeys);

  if (lowSleepStreakDays >= 3) {
    addRule(WEEKLY_RULE_CODE.CONTINUOUS_LOW_SLEEP, {
      evidence: [
        {
          key: 'lowSleepStreakDays',
          label: '연속 수면 부족 일수',
          value: lowSleepStreakDays,
          threshold: 3,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 18
  if (input.context.sensitiveInfoAgreed) {
    const hormoneWithStoolChangeDays = weekLifeRecords.filter((lifeRecord) => {
      if (lifeRecord.hormone !== 'M' && lifeRecord.hormone !== 'E') {
        return false;
      }

      return (weekBoogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
        (boogleRecord) =>
          boogleRecord.hasBowel && isAbnormalStool(boogleRecord.stoolSimple),
      );
    }).length;

    if (hormoneWithStoolChangeDays >= 1) {
      addRule(WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE, {
        evidence: [
          {
            key: 'hormoneWithStoolChangeDays',
            label: '호르몬 변화와 변 상태 변화가 함께 기록된 날',
            value: hormoneWithStoolChangeDays,
            threshold: 1,
            unit: 'DAY',
          },
        ],
      });
    }
  }

  // 룰 19
  const bowelRecords14 = boogleRecords14.filter((record) => record.hasBowel);
  const frequentTimeSlot = findFrequentTimeSlot(bowelRecords14);

  if (frequentTimeSlot !== null && frequentTimeSlot.ratio >= 60) {
    addRule(WEEKLY_RULE_CODE.BOWEL_TIME_SLOT_PATTERN, {
      descriptionOverride: `평소 ${frequentTimeSlot.label}에 배변이 가장 많았어요.`,
      evidence: [
        {
          key: 'frequentTimeSlotRatio',
          label: `${frequentTimeSlot.label} 배변 비율`,
          value: frequentTimeSlot.ratio,
          threshold: 60,
          unit: 'PERCENT',
        },
      ],
    });
  }

  // 룰 20
  const bowelDateKeys = uniqueDateKeys(
    weekBowelRecords.map((record) => record.regDate),
  );
  const bowelDayOffsets = bowelDateKeys.map((dateKey) =>
    daysBetween(input.weekStartDate, new Date(`${dateKey}T00:00:00.000Z`)),
  );
  const bowelDayIntervals = bowelDayOffsets
    .slice(1)
    .map((offset, index) => offset - bowelDayOffsets[index]);
  const bowelIntervalStandardDeviation = standardDeviation(bowelDayIntervals);

  if (
    bowelDateKeys.length >= 3 &&
    bowelDayIntervals.length >= 2 &&
    bowelIntervalStandardDeviation <= RULE_20_MAX_INTERVAL_STANDARD_DEVIATION
  ) {
    addRule(WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM, {
      evidence: [
        {
          key: 'recordedBowelDays',
          label: '배변 기록일',
          value: bowelDateKeys.length,
          threshold: 3,
          unit: 'DAY',
          comparison: 'GTE',
        },
        {
          key: 'bowelIntervalStandardDeviation',
          label: '배변 간격 편차',
          value: Math.round(bowelIntervalStandardDeviation * 10) / 10,
          threshold: RULE_20_MAX_INTERVAL_STANDARD_DEVIATION,
          unit: 'DAY',
          comparison: 'LTE',
        },
      ],
    });
  }

  // 룰 21
  const urgencyCount = weekBoogleRecords.filter((record) =>
    isSymptomPresent(record.urgency),
  ).length;

  if (urgencyCount >= 2) {
    addRule(WEEKLY_RULE_CODE.REPEATED_URGENCY, {
      evidence: [
        {
          key: 'urgencyCount',
          label: '급박감 기록 횟수',
          value: urgencyCount,
          threshold: 2,
          unit: 'COUNT',
        },
      ],
    });
  }

  // 룰 22
  const irregularMealDays = weekLifeRecords.filter(
    (record) => record.mealRegular === 'I',
  ).length;

  if (irregularMealDays >= 4) {
    addRule(WEEKLY_RULE_CODE.IRREGULAR_MEAL, {
      evidence: [
        {
          key: 'irregularMealDays',
          label: '불규칙 식사 기록일',
          value: irregularMealDays,
          threshold: 4,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 23
  const lowStoolAmountCount = weekBowelRecords.filter(
    (record) => record.amount === 'S',
  ).length;

  if (lowStoolAmountCount >= 3) {
    addRule(WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT, {
      evidence: [
        {
          key: 'lowStoolAmountCount',
          label: '적은 배변량 기록 횟수',
          value: lowStoolAmountCount,
          threshold: 3,
          unit: 'COUNT',
        },
      ],
    });
  }

  // 룰 24
  const caffeineWithStoolChangeDays = weekLifeRecords.filter((lifeRecord) => {
    if (lifeRecord.caffeine !== 'M') {
      return false;
    }

    return (weekBoogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) =>
        boogleRecord.hasBowel && isAbnormalStool(boogleRecord.stoolSimple),
    );
  }).length;

  if (caffeineWithStoolChangeDays >= 3) {
    addRule(WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE, {
      evidence: [
        {
          key: 'caffeineWithStoolChangeDays',
          label: '카페인과 변 상태 변화가 함께 기록된 날',
          value: caffeineWithStoolChangeDays,
          threshold: 3,
          unit: 'DAY',
        },
      ],
    });
  }

  // 룰 25
  const noExerciseDays = weekLifeRecords.filter(
    (record) => record.exercise === 'N',
  ).length;
  if (noExerciseDays >= 5 && longestNoBowelDays >= noBowelIntervalThreshold) {
    addRule(WEEKLY_RULE_CODE.NO_EXERCISE_WITH_LONG_INTERVAL, {
      evidence: [
        {
          key: 'noExerciseDays',
          label: '운동하지 않은 일수',
          value: noExerciseDays,
          threshold: 5,
          unit: 'DAY',
        },
        {
          key: 'longestNoBowelDays',
          label: '연속 무배변 일수',
          value: longestNoBowelDays,
          threshold: noBowelIntervalThreshold,
          unit: 'DAY',
        },
      ],
    });
  }

  // 상위 호환 룰 적용
  if (detected.has(WEEKLY_RULE_CODE.NO_BOWEL_WITH_PAIN)) {
    detected.delete(WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL);
  }

  if (detected.has(WEEKLY_RULE_CODE.LONG_TERM_LOOSE_STOOL)) {
    detected.delete(WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL);
    detected.delete(WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL);
  } else if (detected.has(WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL)) {
    detected.delete(WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL);
  }

  return [...detected.values()].sort(
    (left, right) =>
      getWeeklyRuleDefinition(left.ruleCode).order -
      getWeeklyRuleDefinition(right.ruleCode).order,
  );
}

function getExplicitNoBowelDateKeys(
  records: BoogleRecordForReport[],
): string[] {
  const grouped = groupBoogleRecordsByDate(records);

  return [...grouped.entries()]
    .filter(([, dailyRecords]) =>
      dailyRecords.every((record) => !record.hasBowel),
    )
    .map(([dateKey]) => dateKey)
    .sort();
}

function groupBoogleRecordsByDate(
  records: BoogleRecordForReport[],
): Map<string, BoogleRecordForReport[]> {
  const grouped = new Map<string, BoogleRecordForReport[]>();

  for (const record of records) {
    const dateKey = toDateKey(record.regDate);
    const dailyRecords = grouped.get(dateKey) ?? [];
    dailyRecords.push(record);
    grouped.set(dateKey, dailyRecords);
  }

  return grouped;
}

function isPainAtLeastMild(value: string | null): boolean {
  return value === 'M' || value === 'L';
}

function isSymptomPresent(value: string | null): boolean {
  return value === 'M' || value === 'L';
}

function isValidStoolSimple(value: string | null): value is 'H' | 'M' | 'T' {
  return value === 'H' || value === 'M' || value === 'T';
}

function isAbnormalStool(value: string | null): boolean {
  return value === 'H' || value === 'T';
}

function isLowWaterRecord(record: LifeRecordForReport): boolean {
  if (record.waterIntake !== null) {
    return record.waterIntake <= 2;
  }

  // waterIntake 도입 이전 데이터에 대한 호환 처리
  return record.water === 'L';
}

function findFrequentTimeSlot(
  records: BoogleRecordForReport[],
): TimeSlotResult | null {
  if (records.length === 0) {
    return null;
  }

  const slotMap: Record<
    TimeSlotResult['slot'],
    { label: string; count: number }
  > = {
    NIGHT: { label: '23시~05시', count: 0 },
    MORNING: { label: '05시~12시', count: 0 },
    AFTERNOON: { label: '12시~18시', count: 0 },
    EVENING: { label: '18시~23시', count: 0 },
  };

  for (const record of records) {
    const hour = getKstHour(record.regDate);
    const slot =
      hour >= 5 && hour < 12
        ? 'MORNING'
        : hour >= 12 && hour < 18
          ? 'AFTERNOON'
          : hour >= 18 && hour < 23
            ? 'EVENING'
            : 'NIGHT';

    slotMap[slot].count += 1;
  }

  const [slot, value] = (
    Object.entries(slotMap) as Array<
      [TimeSlotResult['slot'], { label: string; count: number }]
    >
  ).sort((left, right) => right[1].count - left[1].count)[0];

  return {
    slot,
    label: value.label,
    count: value.count,
    ratio: (value.count / records.length) * 100,
  };
}

function daysBetween(start: Date, end: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
}
