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
  takenTime: number | null;
  amount: string | null;
  color: string | null;
  memo: string | null;
  autoTags: string[];
  tags: TagDto[];
  updatedAt: Date | null;
}

export interface LifeRecordDetailDto {
  id: number;
  regDate: Date;
  sleep: string | null;
  stress: string | null;
  water: string | null;
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
