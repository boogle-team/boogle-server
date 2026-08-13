import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { GuideController } from './guide.controller';
import { GuideService } from './guide.service';
import { ReportModule } from '@/report/report.module';

@Module({
  imports: [AuthModule, PrismaModule, ReportModule],
  controllers: [GuideController],
  providers: [GuideService],
})
export class GuideModule {}
