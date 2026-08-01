import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterPushTokenResponseDto } from './dto/push-token-response.dto';

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
}
