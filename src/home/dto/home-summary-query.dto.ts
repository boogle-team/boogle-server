import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

export class HomeSummaryQueryDto {
  @ApiPropertyOptional({
    example: '2026-05-12',
    description: '요약 기준 날짜(YYYY-MM-DD). 생략 시 서버 오늘 날짜(KST)',
  })
  @IsOptional()
  // IsDateString(ISO 8601)만으로는 datetime도 통과되므로, 명세대로
  // YYYY-MM-DD 형식만 받도록 고정한다. (home-query.dto와 동일 규칙)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'baseDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  @IsDateString({ strict: true })
  baseDate?: string;
}
