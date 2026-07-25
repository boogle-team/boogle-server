export type MonthlyReportDataStatus = 'ENOUGH' | 'INSUFFICIENT';
export type MonthlyReportPeriodType = 'MONTHLY';
export type MonthlyCompareType = 'PREVIOUS_MONTH';

export type MonthlyChangeTrend =
  | 'INCREASE'
  | 'DECREASE'
  | 'SAME'
  | 'IMPROVED'
  | 'WORSENED'
  | 'NO_PREVIOUS_DATA'
  | 'LOW_COMPLETION';

export type MonthlyChangeReasonCode =
  'PREVIOUS_MONTH_NOT_FOUND' | 'CURRENT_LOW_COMPLETION';

export interface MonthlyReportPeriodDto {
  type: MonthlyReportPeriodType;
  startDate: string;
  endDate: string;
}

export interface MonthlySummaryDto {
  bowelCount: number;
  bowelDays: number;
  intervalAvg: number;
  completionScore: number;
  rhythmScore: number;
  stateScore: number;
  conditionScore: number;
  state: number;
  stateLabel: string;
}

export interface MonthlyRecordStatsDto {
  totalDays: 30;
  calendarDays: number;
  recordedDays: number;
  boogleRecordDays: number;
  lifeRecordDays: number;
  requiredDays: 7;
  completionScore: number;
}

export interface PreviousMonthlySummaryDto extends MonthlySummaryDto {
  period: MonthlyReportPeriodDto;
  userType: string | null;
  userTypeLabel: string | null;
}

export interface MonthlyChangeSummaryDto {
  compareType: MonthlyCompareType;
  compareAvailable: boolean;
  reasonCode?: MonthlyChangeReasonCode;
  bowelCountDiff: number | null;
  bowelCountChangeRate: number | null;
  intervalAvgDiff: number | null;
  completionScoreDiff: number | null;
  conditionScoreDiff: number | null;
  trend: MonthlyChangeTrend;
  description: string;
}

export interface MonthlyStoolDistributionDto {
  stoolSimple: 'H' | 'M' | 'T';
  label: string;
  count: number;
  ratio: number;
}

export interface WeeklyTrendDto {
  weekIndex: number;
  weekStartDate: string;
  weekEndDate: string;
  bowelCount: number;
  conditionScore: number | null;
}

export interface MonthlyLifeFactorStatsDto {
  lowSleepCount: number;
  highCaffeineCount: number;
  noExerciseCount: number;
  highStressCount: number;
  lowWaterCount: number;
  irregularMealCount: number;
}

export interface MonthlyUserTypeDto {
  code: string;
  name: string;
  description: string;
  characterImageUrl?: string | null;
}

export interface MonthlyPatternCardDto {
  level: 'WARN';
  ruleCode: string;
  title: string;
  description: string;
  value: number;
  threshold: number;
  unit: 'DAY' | 'COUNT' | 'PERCENT';
}

export interface MonthlyImprovementDto {
  code:
    | 'CONDITION_SCORE_UP'
    | 'HARD_STOOL_RATIO_DOWN'
    | 'LOW_WATER_HARD_STOOL_DOWN'
    | 'STRESS_WITH_PAIN_DOWN'
    | 'LOW_SLEEP_DOWN';
  title: string;
  description: string;
  previousValue: number;
  currentValue: number;
  unit: 'POINT' | 'DAY' | 'COUNT' | 'PERCENT';
}

export interface MonthlyPdfDto {
  downloadAvailable: boolean;
  endpoint: string;
}

export interface MonthlyNoticeDto {
  code: 'MONTHLY_RECORD_NOT_ENOUGH';
  message: string;
}

export interface MonthlyReportResponseDto {
  period: MonthlyReportPeriodDto;
  dataStatus: MonthlyReportDataStatus;
  summary: MonthlySummaryDto | null;
  recordStats: MonthlyRecordStatsDto;
  previousSummary: PreviousMonthlySummaryDto | null;
  changeSummary: MonthlyChangeSummaryDto | null;
  stoolDistribution: MonthlyStoolDistributionDto[];
  weeklyTrend: WeeklyTrendDto[];
  lifeFactorStats: MonthlyLifeFactorStatsDto | null;
  userType: MonthlyUserTypeDto | null;
  patternCards: MonthlyPatternCardDto[];
  improvements: MonthlyImprovementDto[];
  pdf: MonthlyPdfDto;
  notice: MonthlyNoticeDto | null;
}
