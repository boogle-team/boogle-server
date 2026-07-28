import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getNotifications(user.id);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationService.markAsRead(user.id, notificationId);
  }
}
