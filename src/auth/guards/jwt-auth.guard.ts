import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthService } from '../auth.service';
import { AuthErrorCode } from '../auth-error-code.enum';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;

    if (Array.isArray(authorization) || !authorization) {
      throw new BusinessException(
        AuthErrorCode.TOKEN_REQUIRED,
        'token이 필요합니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = this.authService.authenticateAccessToken(authorization);
    return true;
  }
}
