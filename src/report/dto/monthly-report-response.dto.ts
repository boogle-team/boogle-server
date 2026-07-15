export type MonthlyReportDataStatus = 'ENOUGH' | 'LOW_COMPLETION' | 'NO_RECORD';
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
  intervalAvg: number;
  completionScore: number;
  conditionScore: number | null;
  state: number;
  stateLabel: string;
}

export interface MonthlyRecordStatsDto {
  totalDays: number;
  recordedDays: number;
  boogleRecordDays: number;
  lifeRecordDays: number;
  requiredDays: number;
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
  level: 'OK' | 'WARN' | 'DANGER';
  ruleCode: string;
  title: string;
  description: string;
}

export interface MonthlyPdfDto {
  downloadAvailable: boolean;
  endpoint: string;
}

export interface MonthlyNoticeDto {
  code: 'MONTHLY_LOW_COMPLETION_SCORE' | 'MONTHLY_NO_RECORD';
  message: string;
}

export interface MonthlyReportResponseDto {
  period: MonthlyReportPeriodDto;
  dataStatus: MonthlyReportDataStatus;
  summary: MonthlySummaryDto;
  recordStats: MonthlyRecordStatsDto;
  previousSummary: PreviousMonthlySummaryDto | null;
  changeSummary: MonthlyChangeSummaryDto;
  stoolDistribution: MonthlyStoolDistributionDto[];
  weeklyTrend: WeeklyTrendDto[];
  lifeFactorStats: MonthlyLifeFactorStatsDto | null;
  userType: MonthlyUserTypeDto;
  patternCards: MonthlyPatternCardDto[];
  pdf: MonthlyPdfDto;
  notice: MonthlyNoticeDto | null;
}
