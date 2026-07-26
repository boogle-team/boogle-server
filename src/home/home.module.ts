import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { CalendarModule } from '@/calendar/calendar.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [AuthModule, CalendarModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
