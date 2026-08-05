import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthErrorCode } from './auth-error-code.enum';
import { AuthService } from './auth.service';
import { AuthTemporaryTokenService } from './auth-temporary-token.service';
import { S3StorageService } from '@/common/storage/s3-storage.service';

describe('AuthService', () => {
  const completeMember = {
    id: 1n,
    email: 'member@example.com',
    nickname: '부글이',
    profileImg: null,
    profileImageKey: null,
    gender: 'N',
    ageGroup: 20,
    baselineType: 'R',
    sensInfo: 'F',
    status: 'A',
  };
  const oauthProfile = {
    provider: 'google',
    providerId: 'google-123',
    email: 'member@example.com',
    emailVerified: true,
    nickname: 'Google User',
    profileImage: 'https://example.com/profile.png',
  };
  const prisma = {
    socialAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    memberConsent: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [args: { where: Record<string, unknown>; data: { revokedAt: Date } }]
      >(),
    },
    $transaction: jest.fn(),
  };
  const temporaryTokens = {
    create: jest.fn(),
    consume: jest.fn(),
  };
  const storage = {
    getPublicUrl: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'access-test-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-test-secret';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_REDIRECT_URI =
      'https://api.example.com/api/v1/auth/oauth/google/callback';
    process.env.FRONTEND_OAUTH_CALLBACK_URL =
      'https://frontend.example.com/oauth/callback';
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.memberConsent.findFirst.mockResolvedValue(null);
    service = new AuthService(
      prisma as unknown as PrismaService,
      temporaryTokens as unknown as AuthTemporaryTokenService,
      storage as unknown as S3StorageService,
    );
  });

  it('creates a provider authorization URL with a one-time state', async () => {
    temporaryTokens.create.mockResolvedValue('state-value');

    await expect(service.createAuthorizationUrl('google')).resolves.toEqual(
      expect.objectContaining({
        state: 'state-value',
        stateExpiresIn: 600,
      }),
    );
    expect(temporaryTokens.create).toHaveBeenCalledWith(
      'OAUTH_STATE',
      expect.objectContaining({ provider: 'google' }),
      600,
    );
  });

  it('rejects an OAuth callback whose browser state does not match', async () => {
    await expect(
      service.createOAuthCallbackRedirect(
        'google',
        { code: 'code', state: 'query-state' },
        'browser-state',
      ),
    ).resolves.toBe(
      'https://frontend.example.com/oauth/callback?error=AUTH_INVALID_STATE',
    );
    expect(temporaryTokens.consume).not.toHaveBeenCalled();
  });

  it('logs in an existing social account and returns HOME', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.socialAccount.findFirst.mockResolvedValue({
      userId: 1n,
      provider: 'G',
      providerId: 'google-123',
      user: completeMember,
    });

    const result = await service.exchangeOAuthResult({
      oauthResultCode: 'result-code',
    });

    expect(result).toMatchObject({
      nextAction: 'HOME',
      isNewUser: false,
      onboardingCompleted: true,
      tokenType: 'Bearer',
      user: { id: 1, email: 'member@example.com' },
    });
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it('requires confirmation before linking a verified matching email', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    temporaryTokens.create.mockResolvedValue('account-link-token');
    prisma.socialAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.member.findUnique.mockResolvedValue(completeMember);

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).resolves.toMatchObject({
      nextAction: 'ACCOUNT_LINK_REQUIRED',
      accountLinkToken: 'account-link-token',
      accountLinkTokenExpiresIn: 300,
      provider: 'google',
      email: 'member@example.com',
    });
    expect(temporaryTokens.create).toHaveBeenCalledWith(
      'ACCOUNT_LINK',
      { ...oauthProfile, memberId: '1' },
      300,
    );
    expect(prisma.socialAccount.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('links a confirmed social account and logs in as the existing member', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...oauthProfile,
      memberId: '1',
    });
    prisma.member.findUnique.mockResolvedValue(completeMember);
    prisma.socialAccount.findFirst.mockResolvedValue(null);

    await expect(
      service.linkOAuthAccount({ accountLinkToken: 'account-link-token' }),
    ).resolves.toMatchObject({
      nextAction: 'HOME',
      isNewUser: false,
      user: { id: 1, email: 'member@example.com' },
    });
    expect(temporaryTokens.consume).toHaveBeenCalledWith(
      'account-link-token',
      'ACCOUNT_LINK',
      expect.objectContaining({
        invalidCode: AuthErrorCode.AUTH_INVALID_ACCOUNT_LINK_TOKEN,
        expiredCode: AuthErrorCode.AUTH_ACCOUNT_LINK_TOKEN_EXPIRED,
      }),
    );
    expect(prisma.socialAccount.create).toHaveBeenCalledWith({
      data: {
        userId: 1n,
        provider: 'G',
        providerId: 'google-123',
        email: 'member@example.com',
      },
    });
  });

  it('rejects account linking when the member email has changed', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...oauthProfile,
      memberId: '1',
    });
    prisma.member.findUnique.mockResolvedValue({
      ...completeMember,
      email: 'changed@example.com',
    });

    await expect(
      service.linkOAuthAccount({ accountLinkToken: 'account-link-token' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.SOCIAL_LOGIN_FAILED,
      status: HttpStatus.CONFLICT,
    });
    expect(prisma.socialAccount.create).not.toHaveBeenCalled();
  });

  it('creates a new member and immediately returns a token pair', async () => {
    const newMember = {
      ...completeMember,
      nickname: null,
      profileImg: oauthProfile.profileImage,
      gender: null,
      ageGroup: null,
      baselineType: null,
    };
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockResolvedValue(newMember);

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).resolves.toMatchObject({
      nextAction: 'ONBOARDING_REQUIRED',
      isNewUser: true,
      onboardingCompleted: false,
      tokenType: 'Bearer',
      user: {
        nickname: null,
        profileImage: 'https://example.com/profile.png',
      },
    });
    expect(prisma.member.create).toHaveBeenCalledWith({
      data: {
        email: 'member@example.com',
        nickname: null,
        profileImg: 'https://example.com/profile.png',
        status: 'A',
        sensInfo: 'F',
      },
    });
  });

  it('rejects a provider profile without a verified email', async () => {
    temporaryTokens.consume.mockResolvedValue({
      ...oauthProfile,
      emailVerified: false,
    });

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_UNVERIFIED_EMAIL,
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects OAuth login for a withdrawn member', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.socialAccount.findFirst.mockResolvedValue({
      userId: 1n,
      provider: 'G',
      providerId: 'google-123',
      user: { ...completeMember, status: 'D' },
    });

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_WITHDRAWN_USER,
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('rejects OAuth login when the provider is already linked', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.socialAccount.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2n });
    prisma.member.findUnique.mockResolvedValue(completeMember);

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.SOCIAL_LOGIN_FAILED,
      status: HttpStatus.CONFLICT,
    });
    expect(prisma.socialAccount.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent OAuth unique-constraint failure to a conflict', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.exchangeOAuthResult({ oauthResultCode: 'result-code' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.SOCIAL_LOGIN_FAILED,
      status: HttpStatus.CONFLICT,
    });
  });

  it('rejects logout without a refresh token', async () => {
    await expect(
      service.logout('1', { refreshToken: '' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.REFRESH_TOKEN_REQUIRED,
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('revokes exactly the refresh-token session supplied at logout', async () => {
    temporaryTokens.consume.mockResolvedValue(oauthProfile);
    prisma.socialAccount.findFirst.mockResolvedValue({ user: completeMember });
    const exchange = await service.exchangeOAuthResult({
      oauthResultCode: 'result-code',
    });
    if (exchange.nextAction === 'ACCOUNT_LINK_REQUIRED') {
      throw new Error('기존 소셜 계정 로그인 결과가 필요합니다.');
    }
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 10n,
      userId: 1n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.logout('1', { refreshToken: exchange.refreshToken }),
    ).resolves.toBeNull();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 10n, userId: 1n, revokedAt: null },
    });
    expect(
      prisma.refreshToken.updateMany.mock.calls[0][0].data.revokedAt,
    ).toBeInstanceOf(Date);
  });
});
