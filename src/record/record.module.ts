import { Module } from '@nestjs/common';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RecordController],
  providers: [RecordService],
})
export class RecordModule {}
