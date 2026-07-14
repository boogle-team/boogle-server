import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarDailyQueryDto } from './dto/calendar-daily-query.dto';
import { CalendarService } from './calendar.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getMonthlyCalendar(
    @CurrentUser() user: AuthenticatedUser,
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
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarDailyQueryDto,
  ) {
    return this.calendarService.getDailyRecords(user.id, query.date);
  }
}
