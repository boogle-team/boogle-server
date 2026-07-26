import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { toOptionalBoolean } from '@/guide/dto/boolean-transform.util';

export class GetGuideScreenQueryDto {
  @ApiPropertyOptional({
    description: '조회할 주의 시작일. YYYY-MM-DD 형식, 월요일만 허용',
    example: '2026-07-06',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @ApiPropertyOptional({
    description: '주의 신호를 조회할 월 시작일. YYYY-MM-01 형식',
    example: '2026-07-01',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  monthStartDate?: string;

  @ApiPropertyOptional({
    description: '기존 가이드 피드백 포함 여부',
    default: true,
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  includeFeedback?: boolean;
}
