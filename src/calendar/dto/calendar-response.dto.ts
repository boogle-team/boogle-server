export type BoogleStatus = 'BOWEL' | 'NO_BOWEL' | 'NONE';

export interface CalendarDayDto {
  date: string;
  boogleStatus: BoogleStatus;
  hasLifeRecord: boolean;
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
