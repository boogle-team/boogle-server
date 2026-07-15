// import { ApiOperationOptions } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean } from './boolean-transform.util';

export class GetMonthlyReportQueryDto {
  @IsOptional()
  @IsString()
  monthStartDate?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalBoolean(value))
  @IsBoolean()
  includePattern?: boolean;
}
