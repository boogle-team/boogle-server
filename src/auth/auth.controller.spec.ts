import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = {
    createAuthorizationUrl: jest.fn(),
    createOAuthCallbackRedirect: jest.fn(),
    exchangeOAuthResult: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
  };
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  function createResponse() {
    const redirect = jest.fn();
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    return {
      redirect,
      cookie,
      clearCookie,
      response: { redirect, cookie, clearCookie } as unknown as Response,
    };
  }

  it('stores browser-bound state and redirects to the provider', async () => {
    authService.createAuthorizationUrl.mockResolvedValue({
      authorizationUrl:
        'https://kauth.kakao.com/oauth/authorize?state=state-value',
      state: 'state-value',
      stateExpiresIn: 600,
    });
    const { response, redirect, cookie } = createResponse();

    await controller.startOAuth('kakao', response);

    expect(cookie).toHaveBeenCalledWith(
      'boogle_oauth_state_kakao',
      'state-value',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600_000,
        path: '/api/v1/auth/oauth/kakao/callback',
      }),
    );
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://kauth.kakao.com/oauth/authorize?state=state-value',
    );
  });

  it('propagates an authorization-start service error', async () => {
    const error = new Error('authorization failed');
    authService.createAuthorizationUrl.mockRejectedValue(error);
    const { response, redirect, cookie } = createResponse();

    await expect(controller.startOAuth('google', response)).rejects.toBe(error);
    expect(cookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('passes the browser state cookie to the OAuth callback', async () => {
    authService.createOAuthCallbackRedirect.mockResolvedValue(
      'https://frontend.example.com/oauth/callback?oauthResultCode=result',
    );
    const request = {
      headers: { cookie: 'boogle_oauth_state_google=state-value' },
    } as Request;
    const { response, redirect, clearCookie } = createResponse();

    await controller.handleOAuthCallback(
      'google',
      { code: 'code', state: 'state-value' },
      request,
      response,
    );

    expect(authService.createOAuthCallbackRedirect).toHaveBeenCalledWith(
      'google',
      { code: 'code', state: 'state-value' },
      'state-value',
    );
    expect(clearCookie).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://frontend.example.com/oauth/callback?oauthResultCode=result',
    );
  });

  it('passes an invalid malformed state cookie as undefined', async () => {
    authService.createOAuthCallbackRedirect.mockResolvedValue(
      'https://frontend.example.com/oauth/callback?error=AUTH_INVALID_STATE',
    );
    const request = {
      headers: { cookie: 'boogle_oauth_state_google=%' },
    } as Request;
    const { response, redirect, clearCookie } = createResponse();

    await controller.handleOAuthCallback(
      'google',
      { code: 'code', state: 'state-value' },
      request,
      response,
    );

    expect(authService.createOAuthCallbackRedirect).toHaveBeenCalledWith(
      'google',
      { code: 'code', state: 'state-value' },
      undefined,
    );
    expect(clearCookie).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://frontend.example.com/oauth/callback?error=AUTH_INVALID_STATE',
    );
  });

  it('clears the state cookie and propagates a callback service error', async () => {
    const error = new Error('callback failed');
    authService.createOAuthCallbackRedirect.mockRejectedValue(error);
    const request = {
      headers: { cookie: 'boogle_oauth_state_google=state-value' },
    } as Request;
    const { response, redirect, clearCookie } = createResponse();

    await expect(
      controller.handleOAuthCallback(
        'google',
        { code: 'code', state: 'state-value' },
        request,
        response,
      ),
    ).rejects.toBe(error);
    expect(clearCookie).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('passes the one-time result code to the exchange service', async () => {
    const result = { nextAction: 'ONBOARDING_REQUIRED' };
    authService.exchangeOAuthResult.mockResolvedValue(result);

    await expect(
      controller.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).resolves.toBe(result);
    expect(authService.exchangeOAuthResult).toHaveBeenCalledWith({
      oauthResultCode: 'result-code',
    });
  });

  it('propagates an OAuth-result exchange error', async () => {
    const error = new Error('exchange failed');
    authService.exchangeOAuthResult.mockRejectedValue(error);

    await expect(
      controller.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toBe(error);
  });

  it('requires and forwards the current refresh token on logout', async () => {
    authService.logout.mockResolvedValue(null);
    const dto = { refreshToken: 'refresh-token' };

    await expect(controller.logout({ id: '1' }, dto)).resolves.toBeNull();
    expect(authService.logout).toHaveBeenCalledWith('1', dto);
  });

  it('forwards refresh-token rotation requests', async () => {
    const result = { accessToken: 'new-access-token' };
    authService.refresh.mockResolvedValue(result);

    await expect(
      controller.refresh({ refreshToken: 'refresh-token' }),
    ).resolves.toBe(result);
    expect(authService.refresh).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
    });
  });

  it('propagates a refresh-token rotation error', async () => {
    const error = new Error('refresh failed');
    authService.refresh.mockRejectedValue(error);

    await expect(
      controller.refresh({ refreshToken: 'refresh-token' }),
    ).rejects.toBe(error);
  });
});
