export interface PdfReportResult {
  buffer: Buffer;
  filename: string;
}

export interface MemberForPdf {
  name: string | null;
  nickname: string | null;
  subscription: string;
  subscriptionDate: Date | null;
}

export interface BoogleRecordForPdf {
  id: bigint;
  regDate: Date;
  hasBowel: boolean;
  stoolBristol: number | null;
  stoolSimple: string | null;
  bowelFeeling: string | null;
  stomach: string | null;
  distension: string | null;
  remainingFeeling: string | null;
  urgency: string | null;
  takenTime: number | null;
  amount: string | null;
  color: string | null;
  memo: string | null;
  autoTags: string | null;
}

export interface LifeRecordForPdf {
  id: bigint;
  regDate: Date;
  sleep: string | null;
  sleepTime: number | null;
  stress: string | null;
  water: string | null;
  mealRegular: string | null;
  exercise: string | null;
  caffeine: string | null;
  outing: string | null;
  hormone: string | null;
  memo: string | null;
  autoTags: string | null;
}

export interface WeeklyRecordForPdf {
  weekStartDate: Date;
  bowelCount: number | null;
  intervalAvg: number | null;
  completionScore: number | null;
}

export interface MonthlyRecordForPdf {
  monthStartDate: Date;
  bowelCount: number | null;
  intervalAvg: number | null;
  state: number | null;
  completionScore: number | null;
  conditionScore: number | null;
  userType: string | null;
}

export interface GuideContentForPdf {
  ruleCode: string | null;
  title: string;
  category: string | null;
  content: string;
}

export interface PdfReportBuildData {
  member: MemberForPdf;
  startDate: Date;
  endDate: Date;
  includeDailyRecords: boolean;
  boogleRecords: BoogleRecordForPdf[];
  lifeRecords: LifeRecordForPdf[];
  weeklyRecords: WeeklyRecordForPdf[];
  monthlyRecords: MonthlyRecordForPdf[];
  guides: GuideContentForPdf[];
}
