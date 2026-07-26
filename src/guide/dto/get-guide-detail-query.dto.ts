import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetGuideDetailQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: '패턴 분석 기준 주의 시작일. YYYY-MM-DD 형식',
    example: '2026-07-20',
  })
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: '주의 신호 분석 기준 월의 시작일. YYYY-MM-01 형식',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsString()
  monthStartDate?: string;
}
