import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { NotificationModule } from '@/notification/notification.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ReportSnapshotService } from './report-snapshot.service';

@Module({
  imports: [AuthModule, PrismaModule, NotificationModule],
  controllers: [ReportController],
  providers: [ReportService, ReportSnapshotService],
  exports: [ReportService, ReportSnapshotService],
})
export class ReportModule {}
