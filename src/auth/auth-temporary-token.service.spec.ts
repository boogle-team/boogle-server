import { PrismaService } from '@/prisma/prisma.service';
import { AuthTemporaryTokenService } from './auth-temporary-token.service';

describe('AuthTemporaryTokenService', () => {
  const prisma = {
    authTemporaryToken: {
      create: jest.fn<
        Promise<unknown>,
        [
          args: {
            data: {
              tokenHash: string;
              tokenType: string;
              payload: object;
              expiresAt: Date;
            };
          },
        ]
      >(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  let service: AuthTemporaryTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AUTH_TEMPORARY_TOKEN_RETENTION;
    delete process.env.AUTH_TEMPORARY_TOKEN_CLEANUP_INTERVAL;
    service = new AuthTemporaryTokenService(prisma as unknown as PrismaService);
  });

  it('stores only a hash and returns the raw one-time token', async () => {
    prisma.authTemporaryToken.create.mockResolvedValue({});

    const token = await service.create('OAUTH_RESULT', { kind: 'LOGIN' }, 60);

    expect(token).toHaveLength(43);
    const createInput = prisma.authTemporaryToken.create.mock.calls[0][0];
    expect(createInput.data.tokenType).toBe('OAUTH_RESULT');
    expect(createInput.data.tokenHash).not.toContain(token);
  });

  it('atomically marks a valid token as used', async () => {
    prisma.authTemporaryToken.findUnique.mockResolvedValue({
      id: 1n,
      tokenType: 'SIGNUP_TICKET',
      payload: { provider: 'kakao' },
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prisma.authTemporaryToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.consume('ticket', 'SIGNUP_TICKET', {
        invalidCode: 'INVALID',
        invalidMessage: 'invalid',
        expiredCode: 'EXPIRED',
        expiredMessage: 'expired',
      }),
    ).resolves.toEqual({ provider: 'kakao' });
    const updateCalls = prisma.authTemporaryToken.updateMany.mock
      .calls as unknown as Array<[{ data: { usedAt: Date; payload: object } }]>;
    const updateInput = updateCalls[0][0];
    expect(updateInput.data.usedAt).toBeInstanceOf(Date);
    expect(updateInput.data.payload).toEqual({});
  });

  it('rejects an expired token before consuming it', async () => {
    prisma.authTemporaryToken.findUnique.mockResolvedValue({
      id: 1n,
      tokenType: 'OAUTH_RESULT',
      payload: {},
      expiresAt: new Date(Date.now() - 1),
      usedAt: null,
    });

    await expect(
      service.consume('result', 'OAUTH_RESULT', {
        invalidCode: 'INVALID',
        invalidMessage: 'invalid',
        expiredCode: 'EXPIRED',
        expiredMessage: 'expired',
      }),
    ).rejects.toMatchObject({ errorCode: 'EXPIRED', status: 401 });
    expect(prisma.authTemporaryToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a token that does not exist', async () => {
    prisma.authTemporaryToken.findUnique.mockResolvedValue(null);

    await expect(
      service.consume('missing', 'OAUTH_RESULT', {
        invalidCode: 'INVALID',
        invalidMessage: 'invalid',
        expiredCode: 'EXPIRED',
        expiredMessage: 'expired',
      }),
    ).rejects.toMatchObject({ errorCode: 'INVALID', status: 401 });
    expect(prisma.authTemporaryToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an already-used token', async () => {
    prisma.authTemporaryToken.findUnique.mockResolvedValue({
      id: 1n,
      tokenType: 'LINK_TICKET',
      payload: {},
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    await expect(
      service.consume('used', 'LINK_TICKET', {
        invalidCode: 'INVALID',
        invalidMessage: 'invalid',
        expiredCode: 'EXPIRED',
        expiredMessage: 'expired',
      }),
    ).rejects.toMatchObject({ errorCode: 'INVALID', status: 401 });
    expect(prisma.authTemporaryToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a token consumed concurrently by another request', async () => {
    prisma.authTemporaryToken.findUnique.mockResolvedValue({
      id: 1n,
      tokenType: 'SIGNUP_TICKET',
      payload: {},
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prisma.authTemporaryToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.consume('raced', 'SIGNUP_TICKET', {
        invalidCode: 'INVALID',
        invalidMessage: 'invalid',
        expiredCode: 'EXPIRED',
        expiredMessage: 'expired',
      }),
    ).rejects.toMatchObject({ errorCode: 'INVALID', status: 401 });
  });

  it('deletes used and expired records only after the retention period', async () => {
    const now = new Date('2026-07-18T00:00:00.000Z');
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    process.env.AUTH_TEMPORARY_TOKEN_RETENTION = '7d';
    prisma.authTemporaryToken.deleteMany.mockResolvedValue({ count: 2 });

    await expect(service.cleanupExpiredTokens()).resolves.toEqual({ count: 2 });
    expect(prisma.authTemporaryToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { usedAt: { lte: new Date('2026-07-11T00:00:00.000Z') } },
          { expiresAt: { lte: new Date('2026-07-11T00:00:00.000Z') } },
        ],
      },
    });

    dateNow.mockRestore();
  });
});
