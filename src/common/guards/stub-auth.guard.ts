import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,

  ServiceUnavailableException,

} from '@nestjs/common';
import { Request } from 'express';

/**
 * 임시 인증 가드. 실제 JWT 인증이 붙기 전까지
 * `x-user-id` 헤더 값을 로그인한 사용자로 취급한다.
 * 헤더가 없으면 테스트용 기본 사용자(id=1)를 사용한다.
 *
 * 헤더 값을 그대로 신뢰하므로 어떤 사용자로도 위장할 수 있다.
 * 이는 실제 인증(JWT)이 붙기 전까지 로컬/테스트 환경에서만 쓰는
 * 임시 조치이며, 인증 모듈 완성 후 JwtAuthGuard로 교체 예정이다.

 * 혹시라도 운영 배포(NODE_ENV=production)에 이 상태로 나가면
 * 인증 우회로 이어지지 않도록, 그 경우엔 무조건 실패(fail-closed)한다.

develop
 */
@Injectable()
export class StubAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'StubAuthGuard는 운영 환경에서 사용할 수 없습니다. JwtAuthGuard로 교체가 필요합니다.',
      );
    }


    const request = context.switchToHttp().getRequest<Request>();
    const headerUserId = request.headers['x-user-id'];
    const rawUserId = Array.isArray(headerUserId)
      ? headerUserId[0]
      : headerUserId;

    let userId: bigint;
    try {
      userId = rawUserId ? BigInt(rawUserId) : BigInt(1);
    } catch {
      throw new BadRequestException('유효하지 않은 x-user-id 헤더입니다.');
    }

    request.user = { id: userId };

    return true;
  }
}
