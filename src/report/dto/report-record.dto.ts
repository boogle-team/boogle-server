import type { PatternCardDto } from './weekly-report-response.dto';
import type { WeeklyRuleCode } from '../pattern/weekly-pattern.constants';

export interface BoogleRecordForReport {
  id: bigint;
  regDate: Date;
  bowelMovementAt: Date | null;
  hasBowel: boolean;
  stoolBristol: number | null;
  stoolSimple: string | null;
  bowelFeeling: string | null;
  stomach: number | null;
  distension: string | null;
  remainingFeeling: string | null;
  urgency: string | null;
  takenTime: number | null;
  amount: string | null;
}

export interface LifeRecordForReport {
  id: bigint;
  regDate: Date;
  sleep: string | null;
  sleepTime: number | null;
  caffeine: string | null;
  exercise: string | null;
  stress: string | null;
  water: string | null;
  waterIntake: number | null;
  mealRegular: string | null;
  hormone: string | null;
  foodTags: Array<{
    food: {
      name: string;
    };
  }>;
}

export interface DetectedRule {
  ruleCode: WeeklyRuleCode;
  card: PatternCardDto;
}

export interface WeeklyPatternContext {
  previousMonthlyUserType: string | null;
  sensitiveInfoAgreed: boolean;
}

export interface MonthlyRecordForReport {
  bowelCount: number | null;
  intervalAvg: number | null;
  state: number | null;
  completionScore: number | null;
  conditionScore: number | null;
  userType: string | null;
}
