import { ApiProperty } from '@nestjs/swagger';
import type { BoogleStatus } from '@/calendar/dto/calendar-response.dto';

export class HomeSummaryDayDto {
  @ApiProperty({ example: '2026-05-12', description: '날짜(YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({
    enum: ['BOWEL', 'NO_BOWEL', 'NONE'],
    example: 'BOWEL',
    description:
      '부글 기록 상태(BOWEL 배변 있음 / NO_BOWEL 배변 없음 기록 / NONE 미기록)',
  })
  boogleStatus!: BoogleStatus;

  @ApiProperty({
    example: true,
    description: '그날 생활 기록 존재 여부(초록 점 표시용)',
  })
  hasLifeRecord!: boolean;
}

export class HomeSummaryResponseDto {
  // 요약 기준 날짜(YYYY-MM-DD). days는 이 날짜 앞뒤 N일을 포함한다.
  @ApiProperty({
    example: '2026-05-12',
    description: '요약 기준 날짜(YYYY-MM-DD)',
  })
  baseDate!: string;

  // 날짜 오름차순. 각 날짜의 boogleStatus + hasLifeRecord.
  @ApiProperty({
    type: [HomeSummaryDayDto],
    description: 'baseDate 앞뒤 30일(총 61일)의 날짜별 상태. 날짜 오름차순',
  })
  days!: HomeSummaryDayDto[];
}
