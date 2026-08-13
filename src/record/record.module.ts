import { Module } from '@nestjs/common';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { AuthModule } from '@/auth/auth.module';
import { ReportModule } from '@/report/report.module';

@Module({
  imports: [AuthModule, ReportModule],
  controllers: [RecordController],
  providers: [RecordService],
})
export class RecordModule {}
