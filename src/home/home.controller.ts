import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { StubAuthGuard } from '@/common/guards/stub-auth.guard';
import { HomeQueryDto } from './dto/home-query.dto';
import { HomeService } from './home.service';

@UseGuards(StubAuthGuard)
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHome(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: HomeQueryDto,
  ) {
    return this.homeService.getHome(user.id, query.date);
  }
}
