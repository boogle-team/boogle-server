import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class CalendarDailyQueryDto {
  @ApiProperty({
    example: '2026-06-17',
    description: '조회 날짜(YYYY-MM-DD)',
  })
  @IsDateString({ strict: true })
  date: string;
}
