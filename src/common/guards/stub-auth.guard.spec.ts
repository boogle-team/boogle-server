import {
  BadRequestException,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StubAuthGuard } from './stub-auth.guard';

function createContext(headers: Record<string, unknown>): ExecutionContext {
  const request = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function restoreNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = value;
  }
}

describe('StubAuthGuard', () => {
  let guard: StubAuthGuard;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    guard = new StubAuthGuard();
    restoreNodeEnv(originalNodeEnv);
  });

  afterAll(() => {
    restoreNodeEnv(originalNodeEnv);
  });

  it('헤더가 없으면 기본 사용자(id=1)로 인증한다', () => {
    const context = createContext({});

    expect(guard.canActivate(context)).toBe(true);
    const request = context.switchToHttp().getRequest<{
      user?: { id: bigint };
    }>();
    expect(request.user).toEqual({ id: 1n });
  });

  it('x-user-id 헤더 값으로 인증한다', () => {
    const context = createContext({ 'x-user-id': '42' });

    guard.canActivate(context);

    const request = context.switchToHttp().getRequest<{
      user?: { id: bigint };
    }>();
    expect(request.user).toEqual({ id: 42n });
  });

  it('헤더가 배열이면 첫 번째 값을 사용한다', () => {
    const context = createContext({ 'x-user-id': ['7', '8'] });

    guard.canActivate(context);

    const request = context.switchToHttp().getRequest<{
      user?: { id: bigint };
    }>();
    expect(request.user).toEqual({ id: 7n });
  });

  it('유효하지 않은 헤더 값이면 BadRequestException을 던진다', () => {
    const context = createContext({ 'x-user-id': 'not-a-number' });

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('운영 환경(NODE_ENV=production)이면 무조건 실패한다', () => {
    process.env.NODE_ENV = 'production';
    const context = createContext({});

    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
  });
});
