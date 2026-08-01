import { DayStatusDto } from '@/calendar/dto/calendar-response.dto';

export interface HomeSummaryResponseDto {
  // 요약 기준 날짜(YYYY-MM-DD). days는 이 날짜 앞뒤 N일을 포함한다.
  baseDate: string;
  // 날짜 오름차순. 각 날짜의 boogleStatus + hasLifeRecord.
  days: DayStatusDto[];
}
