import type { WeeklyRuleCode } from '../pattern/weekly-pattern.constants';

export type WeeklyReportDataStatus = 'ENOUGH' | 'INSUFFICIENT';
export type ReportPeriodType = 'WEEKLY';
export type CompareType = 'PREVIOUS_WEEK';
export type ChangeTrend =
  | 'INCREASE'
  | 'DECREASE'
  | 'SAME'
  | 'IMPROVED'
  | 'WORSENED'
  | 'NO_PREVIOUS_DATA';

export interface ReportPeriodDto {
  type: ReportPeriodType;
  startDate: string;
  endDate: string;
}

export interface WeeklySummaryDto {
  bowelCount: number;
  intervalAvg: number;
  completionScore: number;
}

export interface WeeklyRecordStatsDto {
  totalDays: number;
  recordedDays: number;
  boogleRecordDays: number;
  lifeRecordDays: number;
  requiredDays: number;
  completionScore: number;
}

export interface PreviousWeeklySummaryDto extends WeeklySummaryDto {
  period: ReportPeriodDto;
}

export interface ChangeSummaryDto {
  compareType: CompareType;
  bowelCountDiff: number;
  bowelCountChangeRate: number | null;
  intervalAvgDiff: number;
  completionScoreDiff: number;
  trend: ChangeTrend;
  description: string;
}

export interface StoolDistributionDto {
  stoolSimple: 'H' | 'M' | 'T';
  label: string;
  count: number;
  ratio: number;
}

export interface BowelRhythmByDayDto {
  dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  label: string;
  bowelCount: number;
}

export interface FrequentTimeSlotDto {
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string;
  count: number;
}

export interface LifeFactorStatDto {
  sourceField: string;
  condition: string;
  label: string;
  count: number;
}

export interface LifeFactorStatsDto {
  lowSleep: LifeFactorStatDto;
  highCaffeine: LifeFactorStatDto;
  noExercise: LifeFactorStatDto;
  highStress: LifeFactorStatDto;
  lowWater: LifeFactorStatDto;
}

export interface PatternEvidenceMetricDto {
  key: string;
  label: string;
  value: number;
  threshold: number;
  unit: 'DAY' | 'COUNT' | 'PERCENT' | 'MINUTE';
  comparison?: 'GTE' | 'LTE';
}

export interface PatternCardDto {
  level: 'OK' | 'WARN' | 'DANGER';
  ruleCode: WeeklyRuleCode;
  title: string;
  description: string | null;
  guideId?: number | null;
  evidence?: PatternEvidenceMetricDto[];
}

export interface WeeklyGuideDto {
  guideId: number;
  category: 'P';
  title: string;
  summary: string;
  matchedRuleCodes: WeeklyRuleCode[];
  feedbackStatus: string | null;
}

export interface InsufficientNoticeDto {
  code: 'WEEKLY_RECORD_NOT_ENOUGH';
  message: string;
}

export interface WeeklyReportResponseDto {
  period: ReportPeriodDto;
  dataStatus: WeeklyReportDataStatus;
  summary: WeeklySummaryDto | null;
  recordStats: WeeklyRecordStatsDto;
  previousSummary: PreviousWeeklySummaryDto | null;
  changeSummary: ChangeSummaryDto | null;
  stoolDistribution: StoolDistributionDto[];
  bowelRhythmByDay: BowelRhythmByDayDto[];
  frequentTimeSlots: FrequentTimeSlotDto[];
  lifeFactorStats: LifeFactorStatsDto | null;
  patternCards: PatternCardDto[];
  guides: WeeklyGuideDto[];
  insufficientNotice: InsufficientNoticeDto | null;
}
