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
  // 어느 날짜의 기록인지(KST 자정으로 저장됨). 실제 배변 시각은 bowelMovementAt을 쓴다.
  regDate: Date;
  // 배변 시각(KST `HH:mm`). 기록하지 않았으면 null.
  bowelMovementAt: string | null;
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
