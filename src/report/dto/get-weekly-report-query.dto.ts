// import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from './boolean-transform.util';

export class GetWeeklyReportQueryDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includeGuide?: boolean;
}
