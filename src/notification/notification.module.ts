import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { NotificationController } from './notification.controller';
import { NotificationCreationService } from './notification-creation.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationCreationService],
  // 다른 도메인이 알림을 심을 수 있도록 생성 서비스를 공개한다.
  exports: [NotificationCreationService],
})
export class NotificationModule {}
