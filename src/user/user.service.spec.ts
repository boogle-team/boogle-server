import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { UserErrorCode } from './user-error-code.enum';
import { ProfileImageService } from './profile-image.service';
import { UserService } from './user.service';

describe('UserService', () => {
  const member = {
    id: 1n,
    email: 'member@example.com',
    nickname: '부글이',
    profileImg: null,
    profileImageKey: null,
    gender: 'N',
    ageGroup: 20,
    baselineType: 'R',
    sensInfo: 'Y',
    status: 'A',
    regDate: new Date('2026-06-01T00:00:00.000Z'),
  };
  const prisma = {
    member: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    memberConsent: {
      findFirst: jest.fn(),
      create: jest.fn<
        Promise<Record<string, unknown>>,
        [
          args: {
            data: Record<string, unknown>;
          },
        ]
      >(),
      update: jest.fn<
        Promise<{
          id: bigint;
          userId: bigint;
          consentType: string;
          agreed: boolean;
          policyVersion: string;
          agreedAt: Date | null;
          withdrawnAt: Date | null;
          regDate: Date;
        }>,
        [
          args: {
            where: { id: bigint };
            data: {
              agreed?: boolean;
              policyVersion?: string;
              withdrawnAt?: Date;
            };
          },
        ]
      >(),
    },
    lifeRecord: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const profileImages = {
    save: jest.fn(),
    getUrl: jest.fn(),
    deleteBestEffort: jest.fn(),
    assertRequired: jest.fn((file) => {
      if (!file) throw new Error('required');
    }),
  };
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new UserService(
      prisma as unknown as PrismaService,
      profileImages as unknown as ProfileImageService,
    );
  });

  describe('saveOnboarding', () => {
    it('returns the completion flag and user profile in the documented structure', async () => {
      const incompleteMember = {
        ...member,
        nickname: null,
        gender: null,
        ageGroup: null,
        baselineType: null,
        sensInfo: 'F',
      };
      const updatedMember = {
        ...incompleteMember,
        nickname: '새부글',
        gender: 'F',
        ageGroup: 20,
        baselineType: 'R',
        sensInfo: 'Y',
      };
      prisma.member.findUnique.mockResolvedValue(incompleteMember);
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.member.update.mockResolvedValue(updatedMember);
      prisma.memberConsent.create.mockResolvedValue({});

      await expect(
        service.saveOnboarding('1', {
          nickname: '새부글',
          gender: 'F',
          ageGroup: 20,
          baselineType: 'R',
          sensitiveInfoAgreed: true,
          sensitiveInfoPolicyVersion: '2026-07-01',
        }),
      ).resolves.toEqual({
        onboardingCompleted: true,
        user: {
          id: 1,
          email: 'member@example.com',
          nickname: '새부글',
          profileImage: null,
          profileImageSource: null,
          gender: 'F',
          ageGroup: 20,
          baselineType: 'R',
          sensitiveInfoAgreed: true,
        },
      });
    });
  });

  describe('updateSensitiveInfoConsent', () => {
    it('creates a new consent history when the user agrees', async () => {
      const agreedAt = new Date('2026-07-15T00:00:00.000Z');
      prisma.member.findUnique.mockResolvedValue({ ...member, gender: 'F' });
      prisma.memberConsent.create.mockResolvedValue({
        id: 2n,
        userId: 1n,
        consentType: 'SENSITIVE',
        agreed: true,
        policyVersion: '2026.07.15',
        agreedAt,
        withdrawnAt: null,
        regDate: agreedAt,
      });
      prisma.member.update.mockResolvedValue({});

      await expect(
        service.updateSensitiveInfoConsent('1', {
          agreed: true,
          policyVersion: '2026.07.15',
        }),
      ).resolves.toEqual({
        agreed: true,
        policyVersion: '2026.07.15',
        agreedAt: '2026-07-15T00:00:00.000Z',
        withdrawnAt: null,
      });
      expect(prisma.memberConsent.create.mock.calls[0][0]).toMatchObject({
        data: {
          userId: 1n,
          consentType: 'SENSITIVE',
          agreed: true,
        },
      });
    });

    it('rejects a non-boolean agreed value with the specified error code', async () => {
      await expect(
        service.updateSensitiveInfoConsent('1', {
          agreed: 'true' as unknown as boolean,
          policyVersion: '2026.07.15',
        }),
      ).rejects.toMatchObject({
        errorCode: UserErrorCode.SENSITIVE_INFO_AGREEMENT_INVALID,
        status: 400,
      });
      expect(prisma.member.findUnique).not.toHaveBeenCalled();
    });

    it('withdraws the latest consent and clears hormone records', async () => {
      const agreedAt = new Date('2026-07-01T00:00:00.000Z');
      const withdrawnAt = new Date('2026-07-15T00:00:00.000Z');
      prisma.member.findUnique.mockResolvedValue({ ...member, gender: 'F' });
      prisma.memberConsent.findFirst.mockResolvedValue({
        id: 2n,
        agreed: true,
        agreedAt,
      });
      prisma.memberConsent.update.mockResolvedValue({
        id: 2n,
        userId: 1n,
        consentType: 'SENSITIVE',
        agreed: false,
        policyVersion: '2026.07.15',
        agreedAt,
        withdrawnAt,
        regDate: agreedAt,
      });
      prisma.lifeRecord.updateMany.mockResolvedValue({ count: 2 });
      prisma.member.update.mockResolvedValue({});

      await expect(
        service.updateSensitiveInfoConsent('1', {
          agreed: false,
          policyVersion: '2026.07.15',
        }),
      ).resolves.toEqual({
        agreed: false,
        policyVersion: '2026.07.15',
        agreedAt: null,
        withdrawnAt: '2026-07-15T00:00:00.000Z',
      });
      expect(prisma.lifeRecord.updateMany).toHaveBeenCalledWith({
        where: { userId: 1n },
        data: { hormone: null },
      });
    });
  });

  describe('getSensitiveInfoConsent', () => {
    it('returns the latest sensitive-info consent state', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.memberConsent.findFirst.mockResolvedValue({
        agreed: true,
        policyVersion: '2026.06.22',
        agreedAt: new Date('2026-06-20T10:30:00.000Z'),
        withdrawnAt: null,
      });

      await expect(service.getSensitiveInfoConsent('1')).resolves.toEqual({
        agreed: true,
        policyVersion: '2026.06.22',
        agreedAt: '2026-06-20T10:30:00.000Z',
        withdrawnAt: null,
      });
      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(prisma.memberConsent.findFirst).toHaveBeenCalledWith({
        where: { userId: 1n, consentType: 'SENSITIVE' },
        orderBy: { id: 'desc' },
      });
    });

    it('falls back to the legacy member consent state when history is absent', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.memberConsent.findFirst.mockResolvedValue(null);

      await expect(service.getSensitiveInfoConsent('1')).resolves.toEqual({
        agreed: true,
        policyVersion: 'legacy',
        agreedAt: '2026-06-01T00:00:00.000Z',
        withdrawnAt: null,
      });
    });

    it('throws USER_NOT_FOUND before querying consent history', async () => {
      prisma.member.findUnique.mockResolvedValue(null);

      const error = await service
        .getSensitiveInfoConsent('1')
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BusinessException);
      const businessError = error as BusinessException;
      expect(businessError.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
      expect(businessError.getStatus()).toBe(404);
      expect(prisma.memberConsent.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns all linked social accounts in a deterministic order', async () => {
      prisma.member.findUnique.mockResolvedValue({
        ...member,
        socialAccounts: [
          {
            provider: 'K',
            email: 'member@example.com',
            regDate: new Date('2026-06-01T00:00:00.000Z'),
          },
          {
            provider: 'G',
            email: 'member@example.com',
            regDate: new Date('2026-06-02T00:00:00.000Z'),
          },
        ],
        memberConsents: [{ agreed: true }],
      });

      await expect(service.getMe('1')).resolves.toMatchObject({
        sensitiveInfoAgreed: true,
        socialAccounts: [
          {
            provider: 'KAKAO',
            maskedEmail: 'memb****@example.com',
            linkedAt: '2026-06-01T00:00:00.000Z',
          },
          {
            provider: 'GOOGLE',
            maskedEmail: 'memb****@example.com',
            linkedAt: '2026-06-02T00:00:00.000Z',
          },
        ],
      });
      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: { id: 1n },
        include: {
          socialAccounts: {
            select: { provider: true, email: true, regDate: true },
            orderBy: { id: 'asc' },
          },
          memberConsents: {
            where: { consentType: 'SENSITIVE' },
            select: { agreed: true },
            orderBy: { id: 'desc' },
            take: 1,
          },
        },
      });
    });
  });

  describe('updateMe', () => {
    it('withdraws sensitive consent and clears hormone data when gender becomes M', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.memberConsent.findFirst.mockResolvedValue({
        id: 2n,
        agreed: true,
      });
      prisma.member.update.mockResolvedValue({
        ...member,
        gender: 'M',
        sensInfo: 'F',
      });
      prisma.lifeRecord.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        service.updateMe('1', { gender: 'M' }),
      ).resolves.toMatchObject({
        gender: 'M',
        sensitiveInfoAgreed: false,
      });
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { gender: 'M', sensInfo: 'F' },
      });
      expect(prisma.memberConsent.update).toHaveBeenCalledTimes(1);
      expect(prisma.memberConsent.update.mock.calls[0][0]).toMatchObject({
        where: { id: 2n },
        data: { agreed: false },
      });
      expect(
        prisma.memberConsent.update.mock.calls[0][0].data.withdrawnAt,
      ).toBeInstanceOf(Date);
      expect(prisma.lifeRecord.updateMany).toHaveBeenCalledWith({
        where: { userId: 1n },
        data: { hormone: null },
      });
    });

    it('rejects an already-used nickname', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.member.findFirst.mockResolvedValue({ id: 2n });

      await expect(
        service.updateMe('1', { nickname: '중복닉네임' }),
      ).rejects.toMatchObject({
        errorCode: UserErrorCode.NICKNAME_ALREADY_EXISTS,
        status: 409,
      });
    });

    it('maps a concurrent nickname unique-constraint failure to a conflict', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });

      await expect(
        service.updateMe('1', { nickname: '동시변경' }),
      ).rejects.toMatchObject({
        errorCode: UserErrorCode.NICKNAME_ALREADY_EXISTS,
        status: 409,
      });
    });
  });

  describe('profile image storage', () => {
    it('stores the new object key before deleting the previous object', async () => {
      const currentMember = { ...member, profileImageKey: 'old-key' };
      const updatedMember = { ...currentMember, profileImageKey: 'new-key' };
      prisma.member.findUnique.mockResolvedValue(currentMember);
      prisma.member.update.mockResolvedValue(updatedMember);
      profileImages.save.mockResolvedValue('new-key');
      profileImages.getUrl.mockResolvedValue('https://cdn.example.com/new.jpg');

      await expect(
        service.updateProfileImage('1', {
          originalname: 'new.jpg',
          mimetype: 'image/jpeg',
          size: 3,
          buffer: Buffer.from('jpg'),
        }),
      ).resolves.toEqual({
        profileImage: 'https://cdn.example.com/new.jpg',
        profileImageSource: 'CUSTOM',
      });
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { profileImageKey: 'new-key' },
      });
      expect(profileImages.deleteBestEffort).toHaveBeenCalledWith('old-key');
    });

    it('cleans up the new S3 object if the DB update fails', async () => {
      prisma.member.findUnique.mockResolvedValue(member);
      prisma.member.update.mockRejectedValue(new Error('db error'));
      profileImages.save.mockResolvedValue('new-key');

      await expect(
        service.updateProfileImage('1', {
          originalname: 'new.webp',
          mimetype: 'image/webp',
          size: 4,
          buffer: Buffer.from('webp'),
        }),
      ).rejects.toMatchObject({
        errorCode: UserErrorCode.PROFILE_IMAGE_UPDATE_FAILED,
        status: 500,
      });
      expect(profileImages.deleteBestEffort).toHaveBeenCalledWith('new-key');
    });

    it('deletes custom image data and falls back to the social image', async () => {
      const currentMember = {
        ...member,
        profileImg: 'https://social.example.com/profile.jpg',
        profileImageKey: 'custom-key',
      };
      prisma.member.findUnique.mockResolvedValue(currentMember);
      prisma.member.update.mockResolvedValue({
        ...currentMember,
        profileImageKey: null,
      });

      await expect(service.deleteProfileImage('1')).resolves.toEqual({
        profileImage: 'https://social.example.com/profile.jpg',
        profileImageSource: 'SOCIAL',
      });
      expect(profileImages.deleteBestEffort).toHaveBeenCalledWith('custom-key');
    });
  });
});
