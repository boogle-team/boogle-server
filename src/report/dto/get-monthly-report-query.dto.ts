import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from './boolean-transform.util';

export class GetMonthlyReportQueryDto {
  @ApiPropertyOptional({
    description:
      '조회할 월의 시작일입니다. YYYY-MM-01만 허용하며, 생략하면 현재 KST 기준 월의 1일을 사용합니다.',
    example: '2026-07-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsString()
  monthStartDate?: string;

  @ApiPropertyOptional({
    description:
      '이번 달 패턴 카드 포함 여부입니다. true/false 문자열을 허용하며, 생략하면 true입니다.',
    example: true,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includePattern?: boolean;
}
