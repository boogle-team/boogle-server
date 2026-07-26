import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from '@/report/dto/boolean-transform.util';

export class CreatePdfReportRequestDto {
  @ApiProperty({
    description: 'PDF 리포트 조회 시작일 (YYYY-MM-DD)',
    example: '2026-07-01',
    type: String,
    format: 'date',
  })
  @IsString()
  startDate!: string;

  @ApiProperty({
    description: 'PDF 리포트 조회 종료일 (YYYY-MM-DD, 시작일 포함 이후)',
    example: '2026-07-31',
    type: String,
    format: 'date',
  })
  @IsString()
  endDate!: string;

  @ApiPropertyOptional({
    description:
      'PDF에 일별 배변/생활 기록을 포함할지 여부입니다. 생략하면 true입니다.',
    example: true,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includeDailyRecords?: boolean;
}
