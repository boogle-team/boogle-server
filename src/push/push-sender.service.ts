import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';

export interface PushPayload {
  title: string;
  body: string;
  // 알림 클릭 시 이동할 URL(웹 푸시). 없으면 기본 동작.
  link?: string;
}

// FCM이 "이 토큰은 더 이상 유효하지 않다"고 알리는 에러 코드들.
// 이 경우 해당 토큰은 죽은 것이므로 저장소에서 제거한다.
const UNREGISTERED_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

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
    const response = await this.firebase.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      ...(payload.link
        ? { webpush: { fcmOptions: { link: payload.link } } }
        : {}),
    });

    // 발송 결과에서 "죽은 토큰"만 골라 정리한다(누적 방지).
    const invalidTokens = response.responses
      .map((result, index) => ({ result, token: tokens[index] }))
      .filter(
        ({ result }) =>
          result.error !== undefined &&
          UNREGISTERED_TOKEN_ERROR_CODES.has(result.error.code),
      )
      .map(({ token }) => token);

    if (invalidTokens.length > 0) {
      await this.prisma.pushToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
      this.logger.log(`무효 푸시 토큰 ${invalidTokens.length}개 정리`);
    }
  }
}
