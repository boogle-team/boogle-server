import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUserPayload {
  id: bigint;
}

/**
 * 인증 가드(StubAuthGuard 또는 추후 JwtAuthGuard)가 request.user에 채워둔
 * 로그인 사용자 정보를 꺼내는 파라미터 데코레이터.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as CurrentUserPayload;
  },
);
