import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from './boolean-transform.util';

export class GetWeeklyReportQueryDto {
  @ApiPropertyOptional({
    description:
      '조회할 주의 시작일입니다. 월요일인 YYYY-MM-DD만 허용하며, 생략하면 현재 KST 기준 주의 월요일을 사용합니다.',
    example: '2026-07-20',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @ApiPropertyOptional({
    description:
      '패턴에 연결된 생활 가이드 포함 여부입니다. true/false 문자열을 허용하며, 생략하면 true입니다.',
    example: true,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includeGuide?: boolean;
}
