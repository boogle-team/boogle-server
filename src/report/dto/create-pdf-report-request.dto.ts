import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePdfReportRequestDto {
  @ApiProperty({
    description: 'PDF를 생성할 월의 시작일입니다. YYYY-MM-01만 허용합니다.',
    example: '2026-07-01',
    type: String,
    format: 'date',
  })
  @IsString()
  monthStartDate!: string;
}
