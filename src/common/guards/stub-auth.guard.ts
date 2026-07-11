import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * 임시 인증 가드. 실제 JWT 인증이 붙기 전까지
 * `x-user-id` 헤더 값을 로그인한 사용자로 취급한다.
 * 헤더가 없으면 테스트용 기본 사용자(id=1)를 사용한다.
 * 인증 모듈 완성 후 JwtAuthGuard로 교체 예정.
 */
@Injectable()
export class StubAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const headerUserId = request.headers['x-user-id'];
    const userId = headerUserId ? BigInt(headerUserId as string) : BigInt(1);

    request.user = { id: userId };

    return true;
  }
}
