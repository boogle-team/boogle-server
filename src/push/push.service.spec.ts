import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { PushService } from './push.service';

describe('PushService', () => {
  let service: PushService;
  let prisma: {
    pushToken: { upsert: jest.Mock; deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = { pushToken: { upsert: jest.fn(), deleteMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PushService>(PushService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('token 기준 upsert로 등록하고 등록된 token을 반환한다', async () => {
    prisma.pushToken.upsert.mockResolvedValue({ token: 'fcm-abc' });

    const result = await service.registerToken('1', 'fcm-abc');

    expect(result).toEqual({ token: 'fcm-abc' });
    // 신규면 create, 이미 있으면 소유 user만 update (멱등)
    expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
      where: { token: 'fcm-abc' },
      update: { userId: 1n },
      create: { userId: 1n, token: 'fcm-abc' },
    });
  });

  it('같은 토큰 재등록도 동일하게 upsert한다(멱등)', async () => {
    prisma.pushToken.upsert.mockResolvedValue({ token: 'fcm-abc' });

    await service.registerToken('1', 'fcm-abc');
    await service.registerToken('1', 'fcm-abc');

    expect(prisma.pushToken.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.pushToken.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { token: 'fcm-abc' } }),
    );
  });

  describe('deleteToken', () => {
    it('(userId, token)로 스코프해 삭제하고 deleted:true를 반환한다', async () => {
      prisma.pushToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteToken('1', 'fcm-abc');

      expect(result).toEqual({ deleted: true });
      // token만으로 지우면 재등록으로 소유가 넘어간 남의 토큰을 지울 수 있어
      // 반드시 userId까지 조건에 포함한다.
      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1n, token: 'fcm-abc' },
      });
    });

    it('이미 없던 토큰이면 deleted:false로 조용히 성공한다(멱등)', async () => {
      prisma.pushToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteToken('1', 'fcm-abc');

      expect(result).toEqual({ deleted: false });
    });
  });
});
