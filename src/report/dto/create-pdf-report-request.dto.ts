//import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from '@/report/dto/boolean-transform.util';

export class CreatePdfReportRequestDto {
  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includeDailyRecords?: boolean;
}
