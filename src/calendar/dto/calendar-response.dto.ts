import { ApiProperty } from '@nestjs/swagger';

export type BoogleStatus = 'BOWEL' | 'NO_BOWEL' | 'NONE';

// 날짜별 기록 상태의 최소 단위. 홈 요약(/home/summary)과 캘린더가 공유한다.
// 프론트는 boogleStatus + hasLifeRecord 두 필드를 조합해 아이콘을 매핑한다.
export class DayStatusDto {
  @ApiProperty({ example: '2026-06-01', description: '날짜(YYYY-MM-DD)' })
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

export class CalendarDayDto extends DayStatusDto {
  @ApiProperty({
    nullable: true,
    example: 'M',
    description:
      '변 상태(H 딱딱 / M 보통 / T 묽음). boogleStatus=BOWEL일 때만 값이 있고 그 외에는 null',
  })
  stoolSimple!: string | null;
}

export class StoolDistributionEntryDto {
  @ApiProperty({ example: 6, description: '해당 상태의 기록 수' })
  count!: number;

  @ApiProperty({ example: 30, description: '전체 배변 기록 대비 비율(%)' })
  percent!: number;
}

export class StoolDistributionDto {
  @ApiProperty({ type: StoolDistributionEntryDto, description: '딱딱한 변' })
  hard!: StoolDistributionEntryDto;

  @ApiProperty({ type: StoolDistributionEntryDto, description: '보통 변' })
  normal!: StoolDistributionEntryDto;

  @ApiProperty({ type: StoolDistributionEntryDto, description: '묽은 변' })
  loose!: StoolDistributionEntryDto;
}

export class CalendarSummaryDto {
  @ApiProperty({
    example: 10,
    description: '기록 있는 날 수(배변 있음 + 배변 없음)',
  })
  recordedDays!: number;

  @ApiProperty({ example: 3, description: '배변 없음으로 기록한 날 수' })
  noBowelDays!: number;

  @ApiProperty({ example: 17, description: '미기록 날 수' })
  unrecordedDays!: number;

  @ApiProperty({
    type: StoolDistributionDto,
    description: '변 상태 분포(딱딱/보통/묽음)',
  })
  stoolDistribution!: StoolDistributionDto;
}

export class CalendarResponseDto {
  @ApiProperty({ example: 2026, description: '조회 연도' })
  year!: number;

  @ApiProperty({ example: 6, description: '조회 월(1~12)' })
  month!: number;

  @ApiProperty({
    type: [CalendarDayDto],
    description: '해당 월 1일~말일 전체(날짜 오름차순)',
  })
  days!: CalendarDayDto[];

  @ApiProperty({ type: CalendarSummaryDto, description: '월 요약 통계' })
  summary!: CalendarSummaryDto;
}
