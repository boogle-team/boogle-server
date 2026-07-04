import { Module } from '@nestjs/common';
import { LifestyleController } from './lifestyle.controller';
import { LifestyleService } from './lifestyle.service';

@Module({
  controllers: [LifestyleController],
  providers: [LifestyleService],
})
export class LifestyleModule {}
