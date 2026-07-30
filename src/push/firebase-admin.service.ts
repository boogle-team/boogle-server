import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  BatchResponse,
  MulticastMessage,
  getMessaging,
} from 'firebase-admin/messaging';

/**
 * Firebase Admin(웹 푸시 발송) 초기화 래퍼.
 *
 * FIREBASE_SERVICE_ACCOUNT_BASE64(서비스 계정 JSON을 Base64 인코딩한 값)로
 * 초기화한다. env가 없거나 값이 잘못된 환경(로컬 개발 등)에서는 앱을 죽이지 않고
 * 발송을 비활성화(no-op)한다 — 토큰 등록(1단계) 등 다른 기능은 그대로 동작해야 하므로.
 */
@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private enabled = false;

  onModuleInit(): void {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 미설정 — 푸시 발송이 비활성화됩니다.',
      );
      return;
    }

    try {
      // 서비스 계정 JSON은 private_key에 줄바꿈이 있어 env에 그대로 넣기 어렵다.
      // Base64로 통째로 인코딩해 두고 여기서 디코딩·파싱한다.
      const json = Buffer.from(base64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(json) as Record<string, unknown>;

      if (getApps().length === 0) {
        initializeApp({ credential: cert(serviceAccount) });
      }
      this.enabled = true;
      this.logger.log('Firebase Admin 초기화 완료 — 푸시 발송 활성화.');
    } catch (error) {
      this.logger.error(
        'Firebase Admin 초기화 실패 — 푸시 발송 비활성화',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendEachForMulticast(
    message: MulticastMessage,
  ): Promise<BatchResponse> {
    return getMessaging().sendEachForMulticast(message);
  }
}
