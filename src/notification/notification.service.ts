import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  NOTIFICATION_LINK_TO,
  NotificationCategory,
  NotificationListResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: bigint): Promise<NotificationListResponseDto> {
    const alarmMaps = await this.prisma.alarmMap.findMany({
      where: { userId },
      orderBy: { regDate: 'desc' },
      include: { alarm: true },
    });

    // alarmId는 스키마상 nullable이라, 혹시 알람 원본이 삭제/누락된 행은
    // 표시할 제목·내용이 없으므로 목록에서 제외한다.
    const notifications = alarmMaps
      .filter((row) => row.alarm !== null && row.regDate !== null)
      .map((row) => {
        const category = row.alarm!.category as NotificationCategory;
        return {
          id: Number(row.id),
          category,
          title: row.alarm!.title,
          content: row.alarm!.content,
          linkTo: NOTIFICATION_LINK_TO[category],
          regDate: row.regDate!,
          isRead: row.isRead === 'Y',
        };
      });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return { unreadCount, notifications };
  }
}
