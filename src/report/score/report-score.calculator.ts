import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import { toDateKey } from '../pattern/pattern-date.util';
import { getKstTimeInHours } from '@/common/utils/kst-date.util';
import {
  hasBowelMovementAt,
  type TimedBowelRecord,
} from '../util/bowel-record.util';

const MONTHLY_SCORE_DAYS = 30;

export interface MonthlyScoreResult {
  completionScore: number;
  rhythmScore: number;
  stateScore: number;
  conditionScore: number;
}

export function calculateReportScores(
  boogleRecords: BoogleRecordForReport[],
  lifeRecords: LifeRecordForReport[],
  scoringDays: number,
): MonthlyScoreResult {
  const recordedDateSet = new Set([
    ...boogleRecords.map((record) => toDateKey(record.regDate)),
    ...lifeRecords.map((record) => toDateKey(record.regDate)),
  ]);
  const bowelRecords = boogleRecords.filter((record) => record.hasBowel);
  const timedBowelRecords = bowelRecords.filter(hasBowelMovementAt);

  const completionScore = round1(
    Math.min((recordedDateSet.size / scoringDays) * 100, 100),
  );

  const rhythmScore =
    timedBowelRecords.length === 0
      ? 50
      : round1(
          (findMaxCircularTwoHourWindowCount(timedBowelRecords) /
            timedBowelRecords.length) *
            100,
        );

  const normalStoolCount = bowelRecords.filter(
    (record) =>
      record.stoolBristol === 3 ||
      record.stoolBristol === 4 ||
      (record.stoolBristol === null && record.stoolSimple === 'M'),
  ).length;

  const stateScore =
    bowelRecords.length === 0
      ? 50
      : round1((normalStoolCount / bowelRecords.length) * 100);

  const conditionScore = Math.round(
    completionScore * 0.4 + rhythmScore * 0.3 + stateScore * 0.3,
  );

  return {
    completionScore,
    rhythmScore,
    stateScore,
    conditionScore,
  };
}

export function calculateMonthlyScores(
  boogleRecords: BoogleRecordForReport[],
  lifeRecords: LifeRecordForReport[],
): MonthlyScoreResult {
  return calculateReportScores(boogleRecords, lifeRecords, MONTHLY_SCORE_DAYS);
}

function findMaxCircularTwoHourWindowCount(
  bowelRecords: TimedBowelRecord[],
): number {
  const hours = bowelRecords.map((record) =>
    getKstTimeInHours(record.bowelMovementAt),
  );

  return hours.reduce((maxCount, centerHour) => {
    const count = hours.filter(
      (hour) => circularHourDistance(hour, centerHour) <= 2,
    ).length;

    return Math.max(maxCount, count);
  }, 0);
}

function circularHourDistance(leftHour: number, rightHour: number): number {
  const directDistance = Math.abs(leftHour - rightHour);
  return Math.min(directDistance, 24 - directDistance);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
