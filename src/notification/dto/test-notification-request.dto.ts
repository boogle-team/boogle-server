import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { NOTIFICATION_TYPES } from './notification-response.dto';
import type { NotificationType } from './notification-response.dto';

export class TestNotificationRequestDto {
  @ApiProperty({
    enum: NOTIFICATION_TYPES,
    example: 'WARNING',
    description: '발송할 알림 유형(5종). 로그인한 본인에게만 발송된다',
  })
  @IsIn(NOTIFICATION_TYPES)
  type!: NotificationType;
}
