export interface HomeUserDto {
  id: number;
  nickname: string;
  userType: string | null;
  userTypeLabel: string | null;
  joinedDays: number;
}

export interface HomeTodayDto {
  date: string;
  greeting: string;
}

export interface WeekStripDayDto {
  date: string;
  hasRecord: boolean;
}

export interface HomeBoogleRecordDto {
  id: number;
  regDate: Date;
  hasBowel: boolean;
  stoolBristol: number | null;
  stoolSimple: string | null;
  bowelFeeling: string | null;
  stomach: string | null;
}

export interface HomeFoodDto {
  id: number;
  name: string;
}

export interface HomeLifeRecordDto {
  id: number;
  regDate: Date;
  sleep: string | null;
  stress: string | null;
  water: string | null;
  mealRegular: string | null;
  foods: HomeFoodDto[];
}

export interface HomeWeeklyPatternDto {
  ruleCode: string;
  label: string;
  description: string;
}

export interface HomeResponseDto {
  user: HomeUserDto;
  today: HomeTodayDto;
  streak: number;
  weekStrip: WeekStripDayDto[];
  boogleCount: number;
  boogleRecords: HomeBoogleRecordDto[];
  lifeRecord: HomeLifeRecordDto | null;
  weeklyPattern: HomeWeeklyPatternDto | null;
}
