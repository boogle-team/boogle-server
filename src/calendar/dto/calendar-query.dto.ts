import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({ example: 2026, minimum: 1970, description: '조회 연도' })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  year: number;

  @ApiProperty({ example: 6, minimum: 1, maximum: 12, description: '조회 월' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
