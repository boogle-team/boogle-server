import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  NotificationLinkTo,
  NotificationType,
} from '@/notification/dto/notification-response.dto';
import { FirebaseAdminService } from './firebase-admin.service';

export interface PushPayload {
  // 인앱 알림 DB id(= 알림 목록 응답의 notification id). 프론트가 클릭 시 매칭·조회에 사용.
  notificationId: number | string;
  title: string;
  body: string;
  // 아이콘 매핑용 의미 코드(WARNING/RECORD_REMINDER/...).
  type: NotificationType;
  // 클릭 시 이동 대상(GUIDE_WARNING/HOME/REPORT). 임의 URL이 아니라 enum만 전달.
  linkTo: NotificationLinkTo;
}

// FCM이 "이 토큰은 더 이상 유효하지 않다"고 알리는 에러 코드들.
// 이 경우에만 해당 토큰을 죽은 것으로 보고 제거한다.
// (invalid-argument는 토큰이 아니라 메시지 인자 문제에서도 나므로 제외 —
//  포함하면 페이로드 오류 때 멀쩡한 토큰까지 지울 수 있다.)
const UNREGISTERED_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// FCM sendEachForMulticast의 1회 토큰 상한. 초과 시 요청 전체가 실패하므로
// 이 크기로 나눠 순차 발송한다.
const FCM_MULTICAST_LIMIT = 500;

/**
 * 특정 유저의 모든 기기(push_token)로 웹 푸시를 발송한다.
 * "언제 보낼지"(리마인더/연속기록 조건)는 3단계(스케줄러)가 이 서비스를 호출해 정한다.
 */
@Injectable()
export class PushSenderService {
  private readonly logger = new Logger(PushSenderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async send(userId: string, payload: PushPayload): Promise<void> {
    // 발송 비활성 환경(로컬 등)에서는 조용히 no-op.
    if (!this.firebase.isEnabled()) {
      return;
    }

    const memberId = BigInt(userId);
    const rows = await this.prisma.pushToken.findMany({
      where: { userId: memberId },
      select: { token: true },
    });
    if (rows.length === 0) {
      return;
    }

    const tokens = rows.map((row) => row.token);
    const invalidTokens: string[] = [];

    // FCM 상한(500) 단위로 나눠 발송하고, 각 청크의 죽은 토큰을 모은다.
    for (let start = 0; start < tokens.length; start += FCM_MULTICAST_LIMIT) {
      const chunk = tokens.slice(start, start + FCM_MULTICAST_LIMIT);
      // data-only 메시지: notification 필드를 넣지 않는다. 백그라운드에서는 프론트
      // 서비스워커가 showNotification()으로, 포그라운드에서는 onMessage()로 직접
      // 표시해 자동 표시와 수동 표시가 겹치지 않게 한다(프론트 계약). FCM data 값은
      // 모두 문자열이어야 하므로 notificationId는 문자열로 변환해 넣는다.
      const response = await this.firebase.sendEachForMulticast({
        tokens: chunk,
        data: {
          notificationId: String(payload.notificationId),
          title: payload.title,
          body: payload.body,
          type: payload.type,
          linkTo: payload.linkTo,
        },
      });

      response.responses.forEach((result, index) => {
        if (
          result.error !== undefined &&
          UNREGISTERED_TOKEN_ERROR_CODES.has(result.error.code)
        ) {
          invalidTokens.push(chunk[index]);
        }
      });
    }

    if (invalidTokens.length > 0) {
      // 삭제는 반드시 현재 소유자(userId)로 스코프한다. 조회~삭제 사이에 다른
      // 유저가 같은 토큰을 재등록(upsert로 소유 이전)했을 수 있어, token만으로
      // 지우면 남의 유효 토큰을 지울 수 있다.
      await this.prisma.pushToken.deleteMany({
        where: { userId: memberId, token: { in: invalidTokens } },
      });
      this.logger.log(`무효 푸시 토큰 ${invalidTokens.length}개 정리`);
    }
  }
}
