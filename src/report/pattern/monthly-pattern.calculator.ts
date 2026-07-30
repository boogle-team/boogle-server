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
  lowWaterWithHardStoolDays: number | null;
  stressWithPainCount: number | null;
  lowSleepDays: number | null;
  hardStoolRatio: number | null;
}

export function calculateMonthlyPatternMetrics(
  boogleRecords: BoogleRecordForReport[],
  lifeRecords: LifeRecordForReport[],
): MonthlyPatternMetrics {
  const validStoolRecords = boogleRecords.filter(
    (record) =>
      record.hasBowel &&
      (record.stoolSimple === 'H' ||
        record.stoolSimple === 'M' ||
        record.stoolSimple === 'T'),
  );
  const hardStoolCount = validStoolRecords.filter(
    (record) => record.stoolSimple === 'H',
  ).length;
  const hardStoolRatio =
    validStoolRecords.length === 0
      ? null
      : round1((hardStoolCount / validStoolRecords.length) * 100);

  const boogleByDate = groupByDate(boogleRecords);

  const hasWaterAndStoolObservation = lifeRecords.some((lifeRecord) => {
    const waterObserved =
      lifeRecord.waterIntake !== null || lifeRecord.water !== null;
    const dailyBoogleRecords =
      boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? [];
    const stoolObserved = dailyBoogleRecords.some(
      (record) =>
        record.hasBowel &&
        (record.stoolSimple === 'H' ||
          record.stoolSimple === 'M' ||
          record.stoolSimple === 'T'),
    );

    return waterObserved && stoolObserved;
  });

  const lowWaterWithHardStoolDays = hasWaterAndStoolObservation
    ? lifeRecords.filter((lifeRecord) => {
        const isLowWater =
          lifeRecord.waterIntake !== null
            ? lifeRecord.waterIntake <= 2
            : lifeRecord.water === 'L';

        if (!isLowWater) {
          return false;
        }

        const dailyBoogleRecords =
          boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? [];

        return dailyBoogleRecords.some(
          (record) => record.hasBowel && record.stoolSimple === 'H',
        );
      }).length
    : null;

  const hasStressAndPainObservation = lifeRecords.some((lifeRecord) => {
    const dailyBoogleRecords =
      boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? [];

    return (
      lifeRecord.stress !== null &&
      dailyBoogleRecords.some((record) => record.stomach !== null)
    );
  });

  const stressWithPainCount = hasStressAndPainObservation
    ? lifeRecords.filter((lifeRecord) => {
        if (lifeRecord.stress !== 'H') {
          return false;
        }

        const dailyBoogleRecords =
          boogleByDate.get(toDateKey(lifeRecord.regDate)) ?? [];

        return dailyBoogleRecords.some(
          (record) => record.stomach === 'M' || record.stomach === 'L',
        );
      }).length
    : null;

  const hasSleepObservation = lifeRecords.some(
    (record) => record.sleep !== null,
  );
  const lowSleepDays = hasSleepObservation
    ? lifeRecords.filter((record) => record.sleep === 'B').length
    : null;

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
  const {
    lowWaterWithHardStoolDays,
    stressWithPainCount,
    lowSleepDays,
    hardStoolRatio,
  } = metrics;

  if (lowWaterWithHardStoolDays !== null && lowWaterWithHardStoolDays >= 12) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.LOW_WATER_WITH_HARD_STOOL,
      title: '수분 부족과 딱딱한 변',
      description: '수분이 부족했던 날, 딱딱한 변이 함께 나타난 날이 많았어요.',
      value: lowWaterWithHardStoolDays,
      threshold: 12,
      unit: 'DAY',
    });
  }

  if (stressWithPainCount !== null && stressWithPainCount >= 8) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.STRESS_WITH_PAIN,
      title: '스트레스성 복통',
      description: '스트레스가 높았던 날 복통이 자주 함께 있었어요.',
      value: stressWithPainCount,
      threshold: 8,
      unit: 'COUNT',
    });
  }

  if (lowSleepDays !== null && lowSleepDays >= 10) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.LOW_SLEEP,
      title: '수면 부족 반복',
      description: '이번 달 10일 이상 수면이 부족했어요.',
      value: lowSleepDays,
      threshold: 10,
      unit: 'DAY',
    });
  }

  if (hardStoolRatio !== null && hardStoolRatio >= 50) {
    cards.push({
      level: 'WARN',
      ruleCode: MONTHLY_PATTERN_CODE.HARD_STOOL_RATIO,
      title: '딱딱한 변 경향',
      description: '이번 달 변 상태의 절반 이상이 딱딱했어요.',
      value: hardStoolRatio,
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
        `같은 기간 기준 컨디션 점수가 ${previousConditionScore}점에서 ` +
        `${currentConditionScore}점으로 올랐어요.`,
      previousValue: previousConditionScore,
      currentValue: currentConditionScore,
      unit: 'POINT',
    });
  }

  const hardStoolDecrease = getDecrease(
    currentMetrics.hardStoolRatio,
    previousMetrics.hardStoolRatio,
  );

  if (hardStoolDecrease !== null) {
    improvements.push({
      code: 'HARD_STOOL_RATIO_DOWN',
      title: '딱딱한 변 비율 감소',
      description:
        `같은 기간 기준 딱딱한 변 비율이 ` +
        `${hardStoolDecrease.previous}%에서 ` +
        `${hardStoolDecrease.current}%로 줄었어요.`,
      previousValue: hardStoolDecrease.previous,
      currentValue: hardStoolDecrease.current,
      unit: 'PERCENT',
    });
  }

  const lowWaterHardStoolDecrease = getDecrease(
    currentMetrics.lowWaterWithHardStoolDays,
    previousMetrics.lowWaterWithHardStoolDays,
  );

  if (lowWaterHardStoolDecrease !== null) {
    improvements.push({
      code: 'LOW_WATER_HARD_STOOL_DOWN',
      title: '수분과 배변 상태 개선',
      description:
        '같은 기간 기준 수분 부족과 딱딱한 변이 겹친 날이 ' +
        `${lowWaterHardStoolDecrease.previous}일에서 ` +
        `${lowWaterHardStoolDecrease.current}일로 줄었어요.`,
      previousValue: lowWaterHardStoolDecrease.previous,
      currentValue: lowWaterHardStoolDecrease.current,
      unit: 'DAY',
    });
  }

  const stressPainDecrease = getDecrease(
    currentMetrics.stressWithPainCount,
    previousMetrics.stressWithPainCount,
  );

  if (stressPainDecrease !== null) {
    improvements.push({
      code: 'STRESS_WITH_PAIN_DOWN',
      title: '스트레스성 복통 완화',
      description:
        '같은 기간 기준 스트레스와 복통이 함께 나타난 횟수가 ' +
        `${stressPainDecrease.previous}회에서 ` +
        `${stressPainDecrease.current}회로 줄었어요.`,
      previousValue: stressPainDecrease.previous,
      currentValue: stressPainDecrease.current,
      unit: 'COUNT',
    });
  }

  const lowSleepDecrease = getDecrease(
    currentMetrics.lowSleepDays,
    previousMetrics.lowSleepDays,
  );

  if (lowSleepDecrease !== null) {
    improvements.push({
      code: 'LOW_SLEEP_DOWN',
      title: '수면 부족 개선',
      description:
        `같은 기간 기준 수면 부족 일수가 ` +
        `${lowSleepDecrease.previous}일에서 ` +
        `${lowSleepDecrease.current}일로 줄었어요.`,
      previousValue: lowSleepDecrease.previous,
      currentValue: lowSleepDecrease.current,
      unit: 'DAY',
    });
  }

  return improvements;
}

interface DecreasedMetric {
  current: number;
  previous: number;
}

function getDecrease(
  current: number | null,
  previous: number | null,
): DecreasedMetric | null {
  if (current === null || previous === null || current >= previous) {
    return null;
  }

  return { current, previous };
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
