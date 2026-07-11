import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUserPayload {
  id: bigint;
}

/**
 * 인증 가드(StubAuthGuard 또는 추후 JwtAuthGuard)가 request.user에 채워둔
 * 로그인 사용자 정보를 꺼내는 파라미터 데코레이터.
 * 가드가 적용되지 않은 라우트에서 잘못 쓰였을 때 undefined가
 * 그대로 서비스 계층까지 흘러가지 않도록 여기서 막는다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    return request.user;
  },
);
