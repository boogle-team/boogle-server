import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { NotificationModule } from '@/notification/notification.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  // PDF 저장 완료 알림(N104)을 심기 위해 알림 모듈을 가져온다.
  imports: [AuthModule, PrismaModule, NotificationModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
