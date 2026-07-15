import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetGuideDetailQueryDto {
  @ApiPropertyOptional({
    description: '패턴 가이드 판단 기준 주 시작일. YYYY-MM-DD 형식',
    example: '2026-07-06',
  })
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @ApiPropertyOptional({
    description: '주의 신호 판단 기준 월 시작일. YYYY-MM-01 형식',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsString()
  monthStartDate?: string;

  @ApiPropertyOptional({
    description: '선택한 패턴 가이드의 규칙 코드. 패턴 카테고리에서만 사용',
    example: 'LOW_SLEEP',
  })
  @IsOptional()
  @IsString()
  ruleCode?: string;
}
