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
    signup: jest.fn(),
    socialLink: jest.fn(),
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

  it('validates the browser cookie and redirects the provider callback', async () => {
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
    expect(clearCookie).toHaveBeenCalledWith(
      'boogle_oauth_state_google',
      expect.objectContaining({
        path: '/api/v1/auth/oauth/google/callback',
      }),
    );
    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://frontend.example.com/oauth/callback?oauthResultCode=result',
    );
  });

  it('clears the browser cookie and propagates a callback service error', async () => {
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

  it('returns an exchanged OAuth result', async () => {
    const result = { nextAction: 'LOGIN_COMPLETED' };
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

  it('returns a signup result', async () => {
    const dto = {
      signupTicket: 'signup-ticket',
      privacyPolicyAgreed: true,
      privacyPolicyVersion: '2026.07.15',
      sensitiveInfoAgreed: false,
      sensitiveInfoPolicyVersion: '2026.07.15',
    };
    const result = { accessToken: 'access-token' };
    authService.signup.mockResolvedValue(result);

    await expect(controller.signup(dto)).resolves.toBe(result);
    expect(authService.signup).toHaveBeenCalledWith(dto);
  });

  it('propagates a signup error', async () => {
    const error = new Error('signup failed');
    authService.signup.mockRejectedValue(error);

    await expect(
      controller.signup({
        signupTicket: 'signup-ticket',
        privacyPolicyAgreed: true,
        privacyPolicyVersion: '2026.07.15',
        sensitiveInfoAgreed: false,
        sensitiveInfoPolicyVersion: '2026.07.15',
      }),
    ).rejects.toBe(error);
  });

  it('links a social account for the authenticated member', async () => {
    const result = { socialAccounts: [] };
    authService.socialLink.mockResolvedValue(result);

    await expect(
      controller.socialLink({ id: '1' }, { linkTicket: 'link-ticket' }),
    ).resolves.toBe(result);
    expect(authService.socialLink).toHaveBeenCalledWith('1', {
      linkTicket: 'link-ticket',
    });
  });

  it('propagates a social-link error', async () => {
    const error = new Error('link failed');
    authService.socialLink.mockRejectedValue(error);

    await expect(
      controller.socialLink({ id: '1' }, { linkTicket: 'link-ticket' }),
    ).rejects.toBe(error);
  });

  it('logs out the authenticated member', async () => {
    authService.logout.mockResolvedValue(null);

    await expect(controller.logout({ id: '1' }, {})).resolves.toBeNull();
    expect(authService.logout).toHaveBeenCalledWith('1', {});
  });

  it('propagates a logout error', async () => {
    const error = new Error('logout failed');
    authService.logout.mockRejectedValue(error);

    await expect(controller.logout({ id: '1' }, {})).rejects.toBe(error);
  });

  it('returns a refreshed token pair', async () => {
    const result = { accessToken: 'new-access-token' };
    authService.refresh.mockResolvedValue(result);

    await expect(
      controller.refresh({ refreshToken: 'refresh-token' }),
    ).resolves.toBe(result);
    expect(authService.refresh).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
    });
  });

  it('propagates a refresh error', async () => {
    const error = new Error('refresh failed');
    authService.refresh.mockRejectedValue(error);

    await expect(
      controller.refresh({ refreshToken: 'refresh-token' }),
    ).rejects.toBe(error);
  });
});
