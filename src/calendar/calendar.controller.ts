import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { StubAuthGuard } from '@/common/guards/stub-auth.guard';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarDailyQueryDto } from './dto/calendar-daily-query.dto';
import { CalendarService } from './calendar.service';

@UseGuards(StubAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getMonthlyCalendar(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getMonthlyCalendar(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get('daily')
  getDailyRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CalendarDailyQueryDto,
  ) {
    return this.calendarService.getDailyRecords(user.id, query.date);
  }
}
