import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { GENERIC_UNAUTHORIZED_KEY } from '@/common/decorators/generic-unauthorized.decorator';
import { AuthService } from '../auth.service';
import { AuthErrorCode } from '../auth-error-code.enum';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const useGenericUnauthorized =
      Reflect.getMetadata(GENERIC_UNAUTHORIZED_KEY, context.getHandler()) ===
      true;
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;

    if (Array.isArray(authorization) || !authorization) {
      if (useGenericUnauthorized) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }

      throw new BusinessException(
        AuthErrorCode.TOKEN_REQUIRED,
        'token이 필요합니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      request.user = this.authService.authenticateAccessToken(authorization);
    } catch (error) {
      if (
        useGenericUnauthorized &&
        error instanceof BusinessException &&
        error.getStatus() === 401
      ) {
        throw new UnauthorizedException('로그인이 필요합니다.');
      }

      throw error;
    }

    return true;
  }
}
