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
    },
  };
  let service: AuthTemporaryTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
