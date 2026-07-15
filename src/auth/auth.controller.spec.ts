import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = {
    createAuthorizationUrl: jest.fn(),
    createOAuthCallbackRedirect: jest.fn(),
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

  it('redirects the browser to the provider authorization page', async () => {
    authService.createAuthorizationUrl.mockResolvedValue(
      'https://kauth.kakao.com/oauth/authorize?state=value',
    );
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.startOAuth('kakao', response);

    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://kauth.kakao.com/oauth/authorize?state=value',
    );
  });

  it('redirects the provider callback to the frontend callback page', async () => {
    authService.createOAuthCallbackRedirect.mockResolvedValue(
      'https://frontend.example.com/oauth/callback?oauthResultCode=result',
    );
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.handleOAuthCallback(
      'google',
      { code: 'code', state: 'state' },
      response,
    );

    expect(redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://frontend.example.com/oauth/callback?oauthResultCode=result',
    );
  });
});
