import { PatternCardDto } from './weekly-report-response.dto';

export interface BoogleRecordForWeekly {
  regDate: Date;
  hasBowel: boolean;
  stoolSimple: string | null;
  bowelFeeling: string | null;
  stomach: string | null;
  distension: string | null;
  remainingFeeling: string | null;
  urgency: string | null;
}

export interface LifeRecordForWeekly {
  regDate: Date;
  sleepTime: number | null;
  caffeine: string | null;
  exercise: string | null;
  stress: string | null;
  water: string | null;
  mealRegular: string | null;
}

export interface DetectedRule {
  ruleCode: string;
  card: PatternCardDto;
}

export interface WeeklyRecordForReport {
  bowelCount: number | null;
  intervalAvg: number | null;
  completionScore: number | null;
}

export interface MonthlyRecordForReport {
  bowelCount: number | null;
  intervalAvg: number | null;
  state: number | null;
  completionScore: number | null;
  conditionScore: number | null;
  userType: string | null;
}

export interface WeeklyRecordForTrend {
  weekStartDate: Date;
  bowelCount: number | null;
  completionScore: number | null;
}
