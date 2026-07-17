import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthErrorCode } from './auth-error-code.enum';
import { AuthTemporaryTokenService } from './auth-temporary-token.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const member = {
    id: 1n,
    email: 'member@example.com',
    nickname: '부글이',
    profileImg: null,
    gender: null,
    ageGroup: null,
    baselineType: null,
    sensInfo: 'F',
    status: 'A',
  };
  const signupResult = {
    kind: 'SIGNUP',
    provider: 'kakao',
    providerId: '12345',
    email: 'member@example.com',
    emailVerified: true,
    nickname: '부글이',
    profileImage: 'https://example.com/profile.png',
    memberId: null,
    existingProvider: null,
  };
  const prisma = {
    member: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    socialAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    memberConsent: {
      findFirst: jest.fn(),
      createMany: jest.fn<
        Promise<{ count: number }>,
        [args: { data: Array<{ consentType: string; agreed: boolean }> }]
      >(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const temporaryTokens = {
    create: jest.fn(),
    consume: jest.fn(),
  };
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_OAUTH_CALLBACK_URL =
      'https://frontend.example.com/oauth/callback';
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.GOOGLE_REDIRECT_URI =
      'https://api.example.com/api/v1/auth/oauth/google/callback';
    process.env.KAKAO_CLIENT_ID = 'kakao-client';
    process.env.KAKAO_REDIRECT_URI =
      'https://api.example.com/api/v1/auth/oauth/kakao/callback';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new AuthService(
      prisma as unknown as PrismaService,
      temporaryTokens as unknown as AuthTemporaryTokenService,
    );
  });

  it('creates a Google authorization URL with state and PKCE', async () => {
    temporaryTokens.create.mockResolvedValue('state-value');

    const authorization = await service.createAuthorizationUrl('google');
    const result = new URL(authorization.authorizationUrl);

    expect(result.origin + result.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(result.searchParams.get('state')).toBe('state-value');
    expect(result.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorization).toMatchObject({
      state: 'state-value',
      stateExpiresIn: 600,
    });
    expect(temporaryTokens.create).toHaveBeenCalledWith(
      'OAUTH_STATE',
      expect.objectContaining({ provider: 'google' }),
      600,
    );
  });

  it('handles a Kakao callback and stores an existing-member result', async () => {
    temporaryTokens.consume.mockResolvedValue({
      provider: 'kakao',
      redirectUri: 'https://api.example.com/api/v1/auth/oauth/kakao/callback',
      codeVerifier: null,
    });
    temporaryTokens.create.mockResolvedValue('result-code');
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'provider-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 12345,
            kakao_account: {
              email: 'member@example.com',
              is_email_verified: true,
              is_email_valid: true,
              profile: { nickname: '부글이' },
            },
          }),
          { status: 200 },
        ),
      );
    prisma.socialAccount.findFirst.mockResolvedValue({ user: member });

    await expect(
      service.createOAuthCallbackRedirect(
        'kakao',
        {
          code: 'authorization-code',
          state: 'state-value',
        },
        'state-value',
      ),
    ).resolves.toBe(
      'https://frontend.example.com/oauth/callback?oauthResultCode=result-code',
    );
    expect(temporaryTokens.create).toHaveBeenCalledWith(
      'OAUTH_RESULT',
      expect.objectContaining({ kind: 'LOGIN', memberId: '1' }),
      60,
    );
  });

  it('maps provider consent cancellation to a frontend error code', async () => {
    temporaryTokens.consume.mockResolvedValue({
      provider: 'kakao',
      redirectUri: 'https://api.example.com/api/v1/auth/oauth/kakao/callback',
      codeVerifier: null,
    });

    await expect(
      service.createOAuthCallbackRedirect(
        'kakao',
        {
          state: 'state-value',
          error: 'access_denied',
        },
        'state-value',
      ),
    ).resolves.toBe(
      'https://frontend.example.com/oauth/callback?error=AUTH_OAUTH_ACCESS_DENIED',
    );
  });

  it('exchanges a signup result for a one-time signup ticket', async () => {
    temporaryTokens.consume.mockResolvedValue(signupResult);
    temporaryTokens.create.mockResolvedValue('signup-ticket');

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).resolves.toEqual({
      nextAction: 'SIGNUP_REQUIRED',
      signupTicket: 'signup-ticket',
      signupTicketExpiresIn: 600,
      provider: 'KAKAO',
      email: 'member@example.com',
      nickname: '부글이',
      profileImage: 'https://example.com/profile.png',
      isNewUser: true,
      onboardingCompleted: false,
    });
  });

  it('returns a link ticket when another provider uses the email', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...signupResult,
      kind: 'LINK',
      memberId: '1',
      existingProvider: 'GOOGLE',
    });
    temporaryTokens.create.mockResolvedValue('link-ticket');

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_ACCOUNT_LINK_REQUIRED,
      status: 409,
      data: {
        linkTicket: 'link-ticket',
        linkTicketExpiresIn: 600,
        existingProvider: 'GOOGLE',
        maskedEmail: 'memb****@example.com',
      },
    });
  });

  it('creates a member from a signup ticket and records both consents', async () => {
    temporaryTokens.consume.mockResolvedValue(signupResult);
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.memberConsent.createMany.mockResolvedValue({ count: 2 });
    prisma.refreshToken.create.mockResolvedValue({});

    await expect(
      service.signup({
        signupTicket: 'signup-ticket',
        privacyPolicyAgreed: true,
        privacyPolicyVersion: '2026.07.15',
        sensitiveInfoAgreed: false,
        sensitiveInfoPolicyVersion: '2026.07.15',
      }),
    ).resolves.toMatchObject({
      isNewUser: true,
      onboardingCompleted: false,
      refreshTokenExpiresIn: 1209600,
      user: { sensitiveInfoAgreed: false },
    });
    const consentInput = prisma.memberConsent.createMany.mock.calls[0][0];
    expect(
      consentInput.data.map(({ consentType, agreed }) => ({
        consentType,
        agreed,
      })),
    ).toEqual([
      { consentType: 'PRIVACY', agreed: true },
      { consentType: 'SENSITIVE', agreed: false },
    ]);
  });

  it('links an account from a link ticket without exposing linkedAt', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...signupResult,
      kind: 'LINK',
      memberId: '1',
      existingProvider: 'GOOGLE',
    });
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.socialAccount.findMany.mockResolvedValue([
      { provider: 'K', email: 'member@example.com' },
    ]);
    prisma.refreshToken.create.mockResolvedValue({});

    await expect(
      service.socialLink('1', { linkTicket: 'link-ticket' }),
    ).resolves.toMatchObject({
      socialAccounts: [
        { provider: 'KAKAO', maskedEmail: 'memb****@example.com' },
      ],
    });
  });

  it('rejects account linking when the authenticated member does not match', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...signupResult,
      kind: 'LINK',
      memberId: '1',
      existingProvider: 'GOOGLE',
    });

    await expect(
      service.socialLink('2', { linkTicket: 'link-ticket' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_ACCOUNT_LINK_AUTHENTICATION_REQUIRED,
      status: HttpStatus.FORBIDDEN,
    });
    expect(prisma.socialAccount.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a callback when browser-bound state does not match', async () => {
    await expect(
      service.createOAuthCallbackRedirect(
        'google',
        { code: 'code', state: 'returned-state' },
        'browser-state',
      ),
    ).resolves.toBe(
      'https://frontend.example.com/oauth/callback?error=AUTH_OAUTH_STATE_INVALID',
    );
    expect(temporaryTokens.consume).not.toHaveBeenCalled();
  });

  it('maps an unexpected authorization-state creation failure', async () => {
    temporaryTokens.create.mockRejectedValue(new Error('database failed'));

    await expect(
      service.createAuthorizationUrl('google'),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_OAUTH_STATE_CREATE_FAILED,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it.each([
    [AuthErrorCode.AUTH_OAUTH_STATE_INVALID, 'invalid or reused'],
    [AuthErrorCode.AUTH_OAUTH_STATE_EXPIRED, 'expired'],
  ])('maps %s callback token failures', async (errorCode) => {
    temporaryTokens.consume.mockRejectedValue(
      new BusinessException(errorCode, 'state failed', HttpStatus.UNAUTHORIZED),
    );

    await expect(
      service.createOAuthCallbackRedirect(
        'google',
        { code: 'code', state: 'state-value' },
        'state-value',
      ),
    ).resolves.toBe(
      `https://frontend.example.com/oauth/callback?error=${errorCode}`,
    );
  });

  it.each([
    AuthErrorCode.AUTH_OAUTH_RESULT_INVALID,
    AuthErrorCode.AUTH_OAUTH_RESULT_EXPIRED,
  ])('propagates %s while exchanging an OAuth result', async (errorCode) => {
    temporaryTokens.consume.mockRejectedValue(
      new BusinessException(
        errorCode,
        'result failed',
        HttpStatus.UNAUTHORIZED,
      ),
    );

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode,
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it.each([
    AuthErrorCode.AUTH_SIGNUP_TICKET_INVALID,
    AuthErrorCode.AUTH_SIGNUP_TICKET_EXPIRED,
  ])('propagates %s while signing up', async (errorCode) => {
    temporaryTokens.consume.mockRejectedValue(
      new BusinessException(
        errorCode,
        'signup failed',
        HttpStatus.UNAUTHORIZED,
      ),
    );

    await expect(
      service.signup({
        signupTicket: 'signup-ticket',
        privacyPolicyAgreed: true,
        privacyPolicyVersion: '2026.07.15',
        sensitiveInfoAgreed: false,
        sensitiveInfoPolicyVersion: '2026.07.15',
      }),
    ).rejects.toMatchObject({
      errorCode,
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it.each([
    AuthErrorCode.AUTH_LINK_TICKET_INVALID,
    AuthErrorCode.AUTH_LINK_TICKET_EXPIRED,
  ])('propagates %s while linking an account', async (errorCode) => {
    temporaryTokens.consume.mockRejectedValue(
      new BusinessException(errorCode, 'link failed', HttpStatus.UNAUTHORIZED),
    );

    await expect(
      service.socialLink('1', { linkTicket: 'link-ticket' }),
    ).rejects.toMatchObject({
      errorCode,
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('rotates a refresh token atomically', async () => {
    temporaryTokens.consume.mockResolvedValue(signupResult);
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.memberConsent.createMany.mockResolvedValue({ count: 2 });
    prisma.refreshToken.create.mockResolvedValue({});

    const signup = await service.signup({
      signupTicket: 'signup-ticket',
      privacyPolicyAgreed: true,
      privacyPolicyVersion: '2026.07.15',
      sensitiveInfoAgreed: false,
      sensitiveInfoPolicyVersion: '2026.07.15',
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: member.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: member,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const refreshed = await service.refresh({
      refreshToken: signup.refreshToken,
    });
    expect(typeof refreshed.accessToken).toBe('string');
    expect(typeof refreshed.refreshToken).toBe('string');
    expect(prisma.$transaction).toHaveBeenCalled();
    const updateCalls = prisma.refreshToken.updateMany.mock
      .calls as unknown as Array<
      [
        {
          where: {
            id: bigint;
            revokedAt: null;
            expiresAt: { gt: Date };
          };
          data: { revokedAt: Date };
        },
      ]
    >;
    const updateInput = updateCalls[0][0];
    expect(updateInput.where.id).toBe(1n);
    expect(updateInput.where.revokedAt).toBeNull();
    expect(updateInput.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(updateInput.data.revokedAt).toBeInstanceOf(Date);
  });

  it('rejects a concurrent refresh-token reuse attempt', async () => {
    temporaryTokens.consume.mockResolvedValue(signupResult);
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.memberConsent.createMany.mockResolvedValue({ count: 2 });
    prisma.refreshToken.create.mockResolvedValue({});

    const signup = await service.signup({
      signupTicket: 'signup-ticket',
      privacyPolicyAgreed: true,
      privacyPolicyVersion: '2026.07.15',
      sensitiveInfoAgreed: false,
      sensitiveInfoPolicyVersion: '2026.07.15',
    });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 1n,
      userId: member.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: member,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh({ refreshToken: signup.refreshToken }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.REFRESH_TOKEN_INVALID,
      status: HttpStatus.UNAUTHORIZED,
    });
  });
});
