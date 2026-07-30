import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { FirebaseAdminService } from './firebase-admin.service';
import { PushController } from './push.controller';
import { PushSenderService } from './push-sender.service';
import { PushService } from './push.service';

@Module({
  imports: [AuthModule],
  controllers: [PushController],
  providers: [PushService, FirebaseAdminService, PushSenderService],
  // 3단계(스케줄러)가 발송 서비스를 주입해 쓸 수 있도록 공개한다.
  exports: [PushSenderService],
})
export class PushModule {}
