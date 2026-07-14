import {
  ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthErrorCode } from '@/auth/auth-error-code.enum';
import { AuthService } from '@/auth/auth.service';
import { GENERIC_UNAUTHORIZED_KEY } from '@/common/decorators/generic-unauthorized.decorator';
import { BusinessException } from '@/common/exceptions/business.exception';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const authService = {
    authenticateAccessToken: jest.fn(),
  };
  const guard = new JwtAuthGuard(authService as unknown as AuthService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createContext(authorization?: string, genericUnauthorized = false) {
    const handler = () => undefined;
    if (genericUnauthorized) {
      Reflect.defineMetadata(GENERIC_UNAUTHORIZED_KEY, true, handler);
    }
    const request = {
      headers: authorization ? { authorization } : {},
    };

    return {
      context: {
        getHandler: () => handler,
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext,
      request,
    };
  }

  it('uses the common UNAUTHORIZED response for annotated endpoints', () => {
    const { context } = createContext(undefined, true);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('normalizes invalid access tokens for annotated endpoints', () => {
    authService.authenticateAccessToken.mockImplementation(() => {
      throw new BusinessException(
        AuthErrorCode.TOKEN_INVALID,
        '유효하지 않은 token입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    });
    const { context } = createContext('Bearer invalid', true);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('keeps existing auth error codes for other endpoints', () => {
    expect.assertions(2);
    const { context } = createContext();

    try {
      guard.canActivate(context);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      if (error instanceof BusinessException) {
        expect(error.errorCode).toBe(AuthErrorCode.TOKEN_REQUIRED);
      }
    }
  });
});
