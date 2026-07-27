import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreatePdfReportRequestDto {
  @ApiProperty({
    description: 'PDF를 생성할 월의 시작일입니다. YYYY-MM-01만 허용합니다.',
    example: '2026-07-01',
    type: String,
    format: 'date',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-01$/, {
    message: 'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
  })
  monthStartDate!: string;
}
