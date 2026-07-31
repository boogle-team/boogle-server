import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { NotificationErrorCode } from './notification-error-code.enum';
import {
  NOTIFICATION_LINK_TO,
  NotificationCategory,
  NotificationListResponseDto,
  NotificationReadResponseDto,
  toNotificationType,
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
          // 아이콘 매핑용 의미 코드. 원본에 없거나 계약 밖 값이면 null → 프론트 폴백.
          type: toNotificationType(row.alarm!.type),
          title: row.alarm!.title,
          content: row.alarm!.content,
          linkTo: NOTIFICATION_LINK_TO[category],
          regDate: row.regDate!,
          isRead: row.isRead === 'Y',
        };
      });

    return { unreadCount, notifications };
  }

  async markAsRead(
    userId: string,
    notificationId: number,
  ): Promise<NotificationReadResponseDto> {
    const memberId = BigInt(userId);
    const alarmMapId = BigInt(notificationId);

    // 본인 소유(userId 일치) 알림만 갱신한다. isRead를 where에 넣지 않으므로
    // 이미 읽음(Y)인 행도 매칭되어 멱등하게 동작한다. 매칭이 0건이면
    // 존재하지 않거나 타인의 알림이므로 404로 처리한다(존재 여부 노출 방지).
    const { count } = await this.prisma.alarmMap.updateMany({
      where: { id: alarmMapId, userId: memberId },
      data: { isRead: 'Y' },
    });
    if (count === 0) {
      throw new BusinessException(
        NotificationErrorCode.NOTIFICATION_NOT_FOUND,
        '알림을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    const unreadCount = await this.prisma.alarmMap.count({
      where: { userId: memberId, isRead: 'N' },
    });

    return { id: notificationId, isRead: true, unreadCount };
  }
}
