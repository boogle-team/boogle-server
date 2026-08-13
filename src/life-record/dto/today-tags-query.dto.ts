import { IsOptional, IsDateString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TodayTagsQueryDto {
  @ApiPropertyOptional({
    example: '2026-07-02',
    description: 'YYYY-MM-DD. 생략하면 오늘(KST) 기준으로 조회합니다.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date는 YYYY-MM-DD 형식이어야 합니다.',
  })
  @IsDateString({ strict: true })
  date?: string;
}
