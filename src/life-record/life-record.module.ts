import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { LifeRecordController } from './life-record.controller';
import { LifeRecordService } from './life-record.service';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';
import { ReportModule } from '@/report/report.module';

@Module({
  imports: [AuthModule, ReportModule],
  controllers: [LifeRecordController],
  providers: [LifeRecordService, GeminiTagExtractorService],
})
export class LifeRecordModule {}
