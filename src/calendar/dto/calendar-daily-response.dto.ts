export interface TagDto {
  id: number;
  name: string;
}

export interface FoodDto {
  id: number;
  name: string;
}

export interface MedicineDto {
  id: number;
  name: string;
}

export interface BoogleRecordDetailDto {
  id: number;
  regDate: Date;
  hasBowel: boolean;
  stoolBristol: number | null;
  stoolSimple: string | null;
  bowelFeeling: string | null;
  stomach: string | null;
  distension: string | null;
  remainingFeeling: string | null;
  urgency: string | null;
  /**
   * 배변 소요 시간 코드: 1=5분 이하, 2=5~15분, 3=15분 이상.
   * (life_record.sleepTime과 동일한 3단계 규칙을 잠정 적용 — 팀 공통 문서
   * §3(배변 기록)에 아직 정의되어 있지 않음. docs/api/home-calendar-api.md §9 참고)
   */
  takenTime: number | null;
  amount: string | null;
  color: string | null;
  updatedAt: Date | null;
}

export interface LifeRecordDetailDto {
  id: number;
  regDate: Date;
  sleep: string | null;
  stress: string | null;
  water: string | null;
  waterIntake: number | null;
  mealRegular: string | null;
  sleepTime: number | null;
  exercise: string | null;
  caffeine: string | null;
  outing: string | null;
  hormone: string | null;
  memo: string | null;
  autoTags: string[];
  tags: TagDto[];
  foods: FoodDto[];
  medicines: MedicineDto[];
  updatedAt: Date | null;
}

export interface CalendarDailyResponseDto {
  date: string;
  boogleRecords: BoogleRecordDetailDto[];
  lifeRecord: LifeRecordDetailDto | null;
}
