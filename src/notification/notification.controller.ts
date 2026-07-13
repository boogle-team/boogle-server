import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { StubAuthGuard } from '@/common/guards/stub-auth.guard';
import { NotificationService } from './notification.service';

@UseGuards(StubAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.getNotifications(user.id);
  }
}
