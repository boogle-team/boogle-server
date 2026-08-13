import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PushModule } from '@/push/push.module';
import { NotificationController } from './notification.controller';
import { NotificationCreationService } from './notification-creation.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationService } from './notification.service';

@Module({
  // 스케줄러가 푸시를 발송하므로 PushModule(PushSenderService)을 가져온다.
  imports: [AuthModule, PushModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationCreationService,
    NotificationDispatchService,
    NotificationSchedulerService,
  ],
  // 다른 도메인이 알림을 심을 수 있도록 생성/발송 서비스를 공개한다.
  // (이벤트성 알림은 인앱 생성 + 설정 기반 푸시를 함께 처리하는 Dispatch를 쓴다)
  exports: [NotificationCreationService, NotificationDispatchService],
})
export class NotificationModule {}
