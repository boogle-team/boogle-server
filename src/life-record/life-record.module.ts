import { Module } from '@nestjs/common';
import { LifeRecordController } from './life-record.controller';
import { LifeRecordService } from './life-record.service';

@Module({
  controllers: [LifeRecordController],
  providers: [LifeRecordService],
})
export class LifeRecordModule {}
