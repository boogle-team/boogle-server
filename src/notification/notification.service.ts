import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { NotificationErrorCode } from './notification-error-code.enum';
import {
  NOTIFICATION_LINK_TO,
  NotificationCategory,
  NotificationListResponseDto,
  NotificationReadResponseDto,
  NotificationType,
  toNotificationType,
} from './dto/notification-response.dto';
import { NotificationDispatchService } from './notification-dispatch.service';
import type { NotificationTemplateParams } from './notification-templates';

// 알림이 쌓일수록 매번 전체 이력을 긁는 걸 막기 위한 목록 상한.
// (진짜 페이지네이션은 범위 밖 — 필요해지면 커서 기반으로 교체)
const NOTIFICATION_LIST_LIMIT = 100;

// 테스트 발송용 기본 파라미터. WARNING·STREAK은 템플릿에 치환값이 필요하다
// (requiredParams). 실제 발송에서는 감지된 색상·연속 일수가 들어간다.
const TEST_TEMPLATE_PARAMS: Partial<
  Record<NotificationType, NotificationTemplateParams>
> = {
  WARNING: { color: '붉은색' },
  STREAK: { days: 3 },
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  /**
   * 지정한 유형의 알림을 **로그인한 본인에게** 즉시 발송한다(프론트 수신 확인용).
   *
   * 실제 발송 경로(NotificationDispatchService.dispatch)를 그대로 타므로
   * 인앱 알림 생성·알림 설정 게이트·FCM payload가 운영과 동일하다.
   * 차이는 "트리거가 배치/이벤트가 아니라 수동 호출"이라는 점뿐이다.
   */
  async sendTestNotification(
    userId: string,
    type: NotificationType,
  ): Promise<{
    type: NotificationType;
    notificationId: number;
    pushSent: boolean;
  }> {
    const { notificationId, pushSent } = await this.dispatch.dispatch(
      userId,
      type,
      TEST_TEMPLATE_PARAMS[type],
    );

    // pushSent=false면 "인앱 알림은 생겼지만 푸시는 안 갔다"는 뜻이다
    // (알림 설정이 N / 등록된 기기 토큰 없음 / FCM 발송 실패).
    return { type, notificationId, pushSent };
  }

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
