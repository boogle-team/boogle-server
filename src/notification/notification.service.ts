import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  NOTIFICATION_LINK_TO,
  NotificationCategory,
  NotificationListResponseDto,
} from './dto/notification-response.dto';

// 알림이 쌓일수록 매번 전체 이력을 긁는 걸 막기 위한 목록 상한.
// (진짜 페이지네이션은 범위 밖 — 필요해지면 커서 기반으로 교체)
const NOTIFICATION_LIST_LIMIT = 100;

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string): Promise<NotificationListResponseDto> {
    const memberId = BigInt(userId);
    // unreadCount(뱃지)는 목록 상한과 별개로 정확해야 하므로 count를 따로 구한다.
    const [alarmMaps, unreadCount] = await Promise.all([
      this.prisma.alarmMap.findMany({
        where: { userId: memberId },
        orderBy: { regDate: 'desc' },
        include: { alarm: true },
        take: NOTIFICATION_LIST_LIMIT,
      }),
      this.prisma.alarmMap.count({
        where: { userId: memberId, isRead: 'N' },
      }),
    ]);

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

    return { unreadCount, notifications };
  }
}
