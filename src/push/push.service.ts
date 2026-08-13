import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  DeletePushTokenResponseDto,
  RegisterPushTokenResponseDto,
} from './dto/push-token-response.dto';

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  // FCM 기기 토큰을 등록한다. token은 기기별 고유값이므로 token 기준 upsert:
  //  - 신규면 insert, 이미 있으면 소유 user만 갱신(로그아웃→다른 계정 로그인 등으로
  //    같은 기기가 다른 유저에 붙는 경우까지 자연스럽게 처리). 재등록은 멱등.
  async registerToken(
    userId: string,
    token: string,
  ): Promise<RegisterPushTokenResponseDto> {
    const memberId = BigInt(userId);

    const saved = await this.prisma.pushToken.upsert({
      where: { token },
      update: { userId: memberId },
      create: { userId: memberId, token },
    });

    return { token: saved.token };
  }

  // FCM 기기 토큰을 해제한다(로그아웃/알림 끄기). 공용 기기에서 로그아웃한 뒤에도
  // 이전 사용자에게 푸시가 가는 것을 막기 위함.
  //  - 삭제는 반드시 (userId, token)로 스코프한다. 조회~삭제 사이에 다른 유저가 같은
  //    토큰을 재등록(upsert로 소유 이전)했을 수 있어, token만으로 지우면 남의 유효
  //    토큰을 지울 수 있다. (push-sender의 무효 토큰 정리와 동일한 안전 규칙)
  //  - 이미 없던 토큰이면 deleted:false로 조용히 성공 — 로그아웃 재시도가 안전하도록 멱등.
  async deleteToken(
    userId: string,
    token: string,
  ): Promise<DeletePushTokenResponseDto> {
    const memberId = BigInt(userId);

    const { count } = await this.prisma.pushToken.deleteMany({
      where: { userId: memberId, token },
    });

    return { deleted: count > 0 };
  }
}
