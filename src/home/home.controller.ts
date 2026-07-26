import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { HomeQueryDto } from './dto/home-query.dto';
import { HomeSummaryQueryDto } from './dto/home-summary-query.dto';
import { HomeService } from './home.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHome(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HomeQueryDto,
  ) {
    return this.homeService.getHome(user.id, query.date);
  }

  @Get('summary')
  getDateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HomeSummaryQueryDto,
  ) {
    return this.homeService.getDateSummary(user.id, query.baseDate);
  }
}
