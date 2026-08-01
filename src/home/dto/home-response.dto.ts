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
  // 복통 강도(숫자). boogle_record.stomach가 문자 코드→숫자로 변경됨.
  stomach: number | null;
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
  waterIntake: number | null;
  mealRegular: string | null;
  // AI가 메모에서 추출한 태그(auto_tags 콤마 문자열을 배열로 파싱). "이날의 태그" 표시용.
  autoTags: string[];
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
