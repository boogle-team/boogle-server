import { IsDateString } from 'class-validator';

export class CalendarDailyQueryDto {
  @IsDateString({ strict: true })
  date: string;
}
