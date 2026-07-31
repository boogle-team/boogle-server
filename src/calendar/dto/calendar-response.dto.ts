export type BoogleStatus = 'BOWEL' | 'NO_BOWEL' | 'NONE';

// 날짜별 기록 상태의 최소 단위. 홈 요약(/home/summary)과 캘린더가 공유한다.
// 프론트는 boogleStatus + hasLifeRecord 두 필드를 조합해 아이콘을 매핑한다.
export interface DayStatusDto {
  date: string;
  boogleStatus: BoogleStatus;
  hasLifeRecord: boolean;
}

export interface CalendarDayDto extends DayStatusDto {
  stoolSimple: string | null;
}

export interface StoolDistributionEntryDto {
  count: number;
  percent: number;
}

export interface CalendarSummaryDto {
  recordedDays: number;
  noBowelDays: number;
  unrecordedDays: number;
  stoolDistribution: {
    hard: StoolDistributionEntryDto;
    normal: StoolDistributionEntryDto;
    loose: StoolDistributionEntryDto;
  };
}

export interface CalendarResponseDto {
  year: number;
  month: number;
  days: CalendarDayDto[];
  summary: CalendarSummaryDto;
}
