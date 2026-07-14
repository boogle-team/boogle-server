import { PrismaService } from '@/prisma/prisma.service';
import { AuthErrorCode } from './auth-error-code.enum';
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
      createMany:
        jest.fn<
          (args: {
            data: Array<{ consentType: string; agreed: boolean }>;
          }) => Promise<{ count: number }>
        >(),
    },
    refreshToken: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new AuthService(prisma as unknown as PrismaService);
  });

  const mockKakaoProfile = () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 12345,
          kakao_account: {
            email: 'member@example.com',
            is_email_verified: true,
            is_email_valid: true,
            profile: {
              nickname: '부글이',
              profile_image_url: 'https://example.com/profile.png',
            },
          },
        }),
    } as Response);
  };

  it('returns signup-required data without creating a new member', async () => {
    mockKakaoProfile();
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);

    await expect(
      service.socialLogin({ provider: 'kakao', socialToken: 'token' }),
    ).resolves.toEqual({
      nextAction: 'SIGNUP_REQUIRED',
      provider: 'KAKAO',
      email: 'member@example.com',
      nickname: '부글이',
      profileImage: 'https://example.com/profile.png',
      isNewUser: true,
      onboardingCompleted: false,
    });
    expect(prisma.member.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('returns account-link details when another provider uses the email', async () => {
    mockKakaoProfile();
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue({
      ...member,
      socialAccounts: [{ provider: 'G' }],
    });

    await expect(
      service.socialLogin({ provider: 'kakao', socialToken: 'token' }),
    ).rejects.toMatchObject({
      errorCode: AuthErrorCode.AUTH_ACCOUNT_LINK_REQUIRED,
      status: 409,
      data: {
        existingProvider: 'GOOGLE',
        maskedEmail: 'memb****@example.com',
      },
    });
  });

  it('creates member, social account, and both consent histories on signup', async () => {
    mockKakaoProfile();
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(null);
    prisma.member.create.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.memberConsent.createMany.mockResolvedValue({ count: 2 });
    prisma.refreshToken.create.mockResolvedValue({});

    await expect(
      service.signup({
        provider: 'kakao',
        socialToken: 'token',
        privacyPolicyAgreed: true,
        privacyPolicyVersion: '2026.07.15',
        sensitiveInfoAgreed: false,
        sensitiveInfoPolicyVersion: '2026.07.15',
      }),
    ).resolves.toMatchObject({
      isNewUser: true,
      onboardingCompleted: false,
      user: { sensitiveInfoAgreed: false },
    });
    // Jest's mock call storage is typed as any in this project configuration.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const createManyInput = prisma.memberConsent.createMany.mock.calls[0][0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(createManyInput.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ consentType: 'PRIVACY', agreed: true }),
        expect.objectContaining({ consentType: 'SENSITIVE', agreed: false }),
      ]),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('links a verified social account to an existing member', async () => {
    mockKakaoProfile();
    prisma.socialAccount.findFirst.mockResolvedValue(null);
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.socialAccount.create.mockResolvedValue({});
    prisma.socialAccount.findMany.mockResolvedValue([
      {
        provider: 'K',
        email: 'member@example.com',
        regDate: new Date('2026-07-15T00:00:00.000Z'),
      },
    ]);
    prisma.refreshToken.create.mockResolvedValue({});

    await expect(
      service.socialLink({ provider: 'kakao', socialToken: 'token' }),
    ).resolves.toMatchObject({
      onboardingCompleted: false,
      socialAccounts: [
        {
          provider: 'KAKAO',
          maskedEmail: 'memb****@example.com',
          linkedAt: '2026-07-15T00:00:00.000Z',
        },
      ],
    });
    expect(prisma.socialAccount.create).toHaveBeenCalledWith({
      data: {
        userId: 1n,
        provider: 'K',
        providerId: '12345',
        email: 'member@example.com',
      },
    });
  });
});
