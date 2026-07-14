import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { UserErrorCode } from './user-error-code.enum';
import { UserService } from './user.service';

describe('UserService', () => {
  const member = {
    id: 1n,
    email: 'member@example.com',
    nickname: '부글이',
    profileImg: null,
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
      update: jest.fn(),
    },
    memberConsent: {
      findFirst: jest.fn(),
      create:
        jest.fn<
          (args: {
            data: Record<string, unknown>;
          }) => Promise<Record<string, unknown>>
        >(),
      update: jest.fn(),
    },
    lifeRecord: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new UserService(prisma as unknown as PrismaService);
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
      // Jest's mock call storage is typed as any in this project configuration.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

      await expect(service.getSensitiveInfoConsent('1')).rejects.toMatchObject({
        errorCode: UserErrorCode.USER_NOT_FOUND,
        status: 404,
      } satisfies Partial<BusinessException>);
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
});
