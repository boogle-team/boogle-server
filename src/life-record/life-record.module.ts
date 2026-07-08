import { Module } from '@nestjs/common';
import { LifeRecordController } from './life-record.controller';
import { LifeRecordService } from './life-record.service';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';

@Module({
  controllers: [LifeRecordController],
  providers: [LifeRecordService, GeminiTagExtractorService],
})
export class LifeRecordModule {}
