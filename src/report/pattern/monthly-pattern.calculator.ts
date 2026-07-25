import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import type {
  MonthlyImprovementDto,
  MonthlyPatternCardDto,
} from '../dto/monthly-report-response.dto';
import { toDateKey } from './pattern-date.util';

export const MONTHLY_PATTERN_CODE = {
  LOW_WATER_WITH_HARD_STOOL: 'MONTHLY_LOW_WATER_WITH_HARD_STOOL',
  STRESS_WITH_PAIN: 'MONTHLY_STRESS_WITH_PAIN',
  LOW_SLEEP: 'MONTHLY_LOW_SLEEP',
  HARD_STOOL_RATIO: 'MONTHLY_HARD_STOOL_RATIO',
} as const;

export type MonthlyPatternCode =
  (typeof MONTHLY_PATTERN_CODE)[keyof typeof MONTHLY_PATTERN_CODE];

export interface MonthlyPatternMetrics {
  lowWaterWithHardStoolDays: number;
  stressWithPainCount: number;
  lowSleepDays: number;
  hardStoolRatio: number;
}

export function calculateMonthlyPatternMetrics(
  boogleRecords: BoogleRecordForReport[],
  lifeRecords: LifeRecordForReport[],
): MonthlyPatternMetrics {
  const bowelRecords = boogleRecords.filter((record) => record.hasBowel);
  const validStoolRecords = bowelRecords.filter(
    (record) =>
      record.stoolSimple === 'H' ||
      record.stoolSimple === 'M' ||
      record.stoolSimple === 'T',
  );
  const hardStoolCount = validStoolRecords.filter(
    (record) => record.stoolSimple === 'H',
  ).length;
  const hardStoolRatio =
    validStoolRecords.length === 0
      ? 0
      : round1((hardStoolCount / validStoolRecords.length) * 100);

  const boogleByDate = groupByDate(boogleRecords);

  const lowWaterWithHardStoolDays = lifeRecords.filter((lifeRecord) => {
    const isLowWater =
      lifeRecord.waterIntake !== null
        ? lifeRecord.waterIntake <= 2
        : lifeRecord.water === 'L';

    if (!isLowWater) {
      return false;
    }

    return (boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) =>
        boogleRecord.hasBowel && boogleRecord.stoolSimple === 'H',
    );
  }).length;

  const stressWithPainCount = lifeRecords.filter((lifeRecord) => {
    if (lifeRecord.stress !== 'H') {
      return false;
    }

    return (boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? []).some(
      (boogleRecord) =>
        boogleRecord.stomach === 'M' || boogleRecord.stomach === 'L',
    );
  }).length;

  const lowSleepDays = lifeRecords.filter(
    (record) => record.sleep === 'B',
  ).length;

  return {
    lowWaterWithHardStoolDays,
    stressWithPainCount,
    lowSleepDays,
    hardStoolRatio,
  };
}

export function buildMonthlyPatternCards(
  metrics: MonthlyPatternMetrics,
): MonthlyPatternCardDto[] {
  const cards: MonthlyPatternCardDto[] = [];

  if (metrics.lowWaterWithHardStoolDays >= 12) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.LOW_WATER_WITH_HARD_STOOL,
      title: '수분 부족과 딱딱한 변',
      description: '수분이 부족했던 날, 딱딱한 변이 함께 나타난 날이 많았어요.',
      value: metrics.lowWaterWithHardStoolDays,
      threshold: 12,
      unit: 'DAY',
    });
  }

  if (metrics.stressWithPainCount >= 8) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.STRESS_WITH_PAIN,
      title: '스트레스성 복통',
      description: '스트레스가 높았던 날 복통이 자주 함께 있었어요.',
      value: metrics.stressWithPainCount,
      threshold: 8,
      unit: 'COUNT',
    });
  }

  if (metrics.lowSleepDays >= 10) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.LOW_SLEEP,
      title: '수면 부족 반복',
      description: '이번 달 10일 이상 수면이 부족했어요.',
      value: metrics.lowSleepDays,
      threshold: 10,
      unit: 'DAY',
    });
  }

  if (metrics.hardStoolRatio >= 50) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.HARD_STOOL_RATIO,
      title: '딱딱한 변 경향',
      description: '이번 달 변 상태의 절반 이상이 딱딱했어요.',
      value: metrics.hardStoolRatio,
      threshold: 50,
      unit: 'PERCENT',
    });
  }

  return cards;
}

export function buildMonthlyImprovements(
  currentMetrics: MonthlyPatternMetrics,
  previousMetrics: MonthlyPatternMetrics | null,
  currentConditionScore: number,
  previousConditionScore: number | null,
): MonthlyImprovementDto[] {
  if (previousMetrics === null || previousConditionScore === null) {
    return [];
  }

  const improvements: MonthlyImprovementDto[] = [];

  if (currentConditionScore > previousConditionScore) {
    improvements.push({
      code: 'CONDITION_SCORE_UP',
      title: '부글 컨디션 점수 상승',
      description:
        `지난달보다 컨디션 점수가 ${previousConditionScore}점에서 ` +
        `${currentConditionScore}점으로 올랐어요.`,
      previousValue: previousConditionScore,
      currentValue: currentConditionScore,
      unit: 'POINT',
    });
  }

  if (currentMetrics.hardStoolRatio < previousMetrics.hardStoolRatio) {
    improvements.push({
      code: 'HARD_STOOL_RATIO_DOWN',
      title: '딱딱한 변 비율 감소',
      description:
        `딱딱한 변 비율이 지난달 ${previousMetrics.hardStoolRatio}%에서 ` +
        `${currentMetrics.hardStoolRatio}%로 줄었어요.`,
      previousValue: previousMetrics.hardStoolRatio,
      currentValue: currentMetrics.hardStoolRatio,
      unit: 'PERCENT',
    });
  }

  if (
    currentMetrics.lowWaterWithHardStoolDays <
    previousMetrics.lowWaterWithHardStoolDays
  ) {
    improvements.push({
      code: 'LOW_WATER_HARD_STOOL_DOWN',
      title: '수분과 배변 상태 개선',
      description:
        '수분 부족과 딱딱한 변이 겹친 날이 지난달 ' +
        `${previousMetrics.lowWaterWithHardStoolDays}일에서 ` +
        `${currentMetrics.lowWaterWithHardStoolDays}일로 줄었어요.`,
      previousValue: previousMetrics.lowWaterWithHardStoolDays,
      currentValue: currentMetrics.lowWaterWithHardStoolDays,
      unit: 'DAY',
    });
  }

  if (
    currentMetrics.stressWithPainCount < previousMetrics.stressWithPainCount
  ) {
    improvements.push({
      code: 'STRESS_WITH_PAIN_DOWN',
      title: '스트레스성 복통 완화',
      description:
        '스트레스와 복통이 함께 나타난 횟수가 지난달 ' +
        `${previousMetrics.stressWithPainCount}회에서 ` +
        `${currentMetrics.stressWithPainCount}회로 줄었어요.`,
      previousValue: previousMetrics.stressWithPainCount,
      currentValue: currentMetrics.stressWithPainCount,
      unit: 'COUNT',
    });
  }

  if (currentMetrics.lowSleepDays < previousMetrics.lowSleepDays) {
    improvements.push({
      code: 'LOW_SLEEP_DOWN',
      title: '수면 부족 개선',
      description:
        `수면 부족 일수가 지난달 ${previousMetrics.lowSleepDays}일에서 ` +
        `${currentMetrics.lowSleepDays}일로 줄었어요.`,
      previousValue: previousMetrics.lowSleepDays,
      currentValue: currentMetrics.lowSleepDays,
      unit: 'DAY',
    });
  }

  return improvements;
}

function groupByDate(
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
