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
  isInRange,
  longestConsecutiveDays,
  splitConsecutiveDateKeys,
  standardDeviation,
  toDateKey,
  uniqueDateKeys,
} from './pattern-date.util';

const RULE_20_MAX_INTERVAL_STANDARD_DEVIATION = 0.5;

interface DetectWeeklyPatternsInput {
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
    isInRange(record.regDate, input.weekStartDate, input.weekEndDateExclusive),
  );
  const weekLifeRecords = input.lifeRecords.filter((record) =>
    isInRange(record.regDate, input.weekStartDate, input.weekEndDateExclusive),
  );

  const lookback14Start = addUtcDays(input.weekEndDateExclusive, -14);
  const lookback30Start = addUtcDays(input.weekEndDateExclusive, -30);

  const boogleRecords14 = input.boogleRecords.filter((record) =>
    isInRange(record.regDate, lookback14Start, input.weekEndDateExclusive),
  );
  const boogleRecords30 = input.boogleRecords.filter((record) =>
    isInRange(record.regDate, lookback30Start, input.weekEndDateExclusive),
  );

  const detected = new Map<WeeklyRuleCode, DetectedRule>();

  const addRule = (
    ruleCode: WeeklyRuleCode,
    descriptionOverride?: string,
  ): void => {
    const definition = getWeeklyRuleDefinition(ruleCode);

    detected.set(ruleCode, {
      ruleCode,
      card: {
        level: definition.level,
        ruleCode,
        title: definition.title,
        description: descriptionOverride ?? definition.description,
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
  const lowBowel30Threshold = previousType === 'C' ? 8 : 12;
  if (bowelRecords30.length < lowBowel30Threshold) {
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
    addRule(WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL);
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
    addRule(WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL);
  }

  // 룰 8
  const looseStoolDateKeys = uniqueDateKeys(
    looseStoolRecords.map((record) => record.regDate),
  );
  const looseStreakThreshold = previousType === 'L' ? 5 : 3;
  if (longestConsecutiveDays(looseStoolDateKeys) >= looseStreakThreshold) {
    addRule(WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL);
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
  if (
    weekBoogleRecords.filter((record) => record.distension === 'L').length >= 2
  ) {
    addRule(WEEKLY_RULE_CODE.REPEATED_DISTENSION);
  }

  // 룰 12
  if (
    weekBoogleRecords.filter((record) =>
      isSymptomPresent(record.remainingFeeling),
    ).length >= 3
  ) {
    addRule(WEEKLY_RULE_CODE.REPEATED_REMAINING_FEELING);
  }

  // 룰 13
  if (
    weekBowelRecords.filter(
      (record) =>
        record.bowelFeeling === 'H' &&
        record.takenTime !== null &&
        record.takenTime >= 15,
    ).length >= 2
  ) {
    addRule(WEEKLY_RULE_CODE.PROLONGED_BOWEL_TIME);
  }

  const weekBoogleByDate = groupBoogleRecordsByDate(weekBoogleRecords);

  // 룰 14
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
    addRule(WEEKLY_RULE_CODE.LOW_WATER_WITH_HARD_STOOL);
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
    addRule(WEEKLY_RULE_CODE.FOOD_WITH_LOOSE_STOOL);
  }

  // 룰 17
  const lowSleepDateKeys = uniqueDateKeys(
    weekLifeRecords
      .filter((record) => record.sleep === 'B')
      .map((record) => record.regDate),
  );
  if (longestConsecutiveDays(lowSleepDateKeys) >= 3) {
    addRule(WEEKLY_RULE_CODE.CONTINUOUS_LOW_SLEEP);
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
      addRule(WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE);
    }
  }

  // 룰 19
  const bowelRecords14 = boogleRecords14.filter((record) => record.hasBowel);
  const frequentTimeSlot = findFrequentTimeSlot(bowelRecords14);

  if (frequentTimeSlot !== null && frequentTimeSlot.ratio >= 60) {
    addRule(
      WEEKLY_RULE_CODE.BOWEL_TIME_SLOT_PATTERN,
      `평소 ${frequentTimeSlot.label}에 배변이 가장 많았어요.`,
    );
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

  if (
    bowelDateKeys.length >= 3 &&
    bowelDayIntervals.length >= 2 &&
    standardDeviation(bowelDayIntervals) <=
      RULE_20_MAX_INTERVAL_STANDARD_DEVIATION
  ) {
    addRule(WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM);
  }

  // 룰 21
  if (
    weekBoogleRecords.filter((record) => isSymptomPresent(record.urgency))
      .length >= 2
  ) {
    addRule(WEEKLY_RULE_CODE.REPEATED_URGENCY);
  }

  // 룰 22
  if (
    weekLifeRecords.filter((record) => record.mealRegular === 'I').length >= 4
  ) {
    addRule(WEEKLY_RULE_CODE.IRREGULAR_MEAL);
  }

  // 룰 23
  if (weekBowelRecords.filter((record) => record.amount === 'S').length >= 3) {
    addRule(WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT);
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
    addRule(WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE);
  }

  // 룰 25
  const noExerciseDays = weekLifeRecords.filter(
    (record) => record.exercise === 'N',
  ).length;
  if (noExerciseDays >= 5 && longestNoBowelDays >= noBowelIntervalThreshold) {
    addRule(WEEKLY_RULE_CODE.NO_EXERCISE_WITH_LONG_INTERVAL);
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
    const hour = record.regDate.getUTCHours();
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
