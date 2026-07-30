import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { PushSenderService } from './push-sender.service';

describe('PushSenderService', () => {
  let service: PushSenderService;
  let prisma: {
    pushToken: { findMany: jest.Mock; deleteMany: jest.Mock };
  };
  let firebase: {
    isEnabled: jest.Mock;
    sendEachForMulticast: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      pushToken: { findMany: jest.fn(), deleteMany: jest.fn() },
    };
    firebase = {
      isEnabled: jest.fn().mockReturnValue(true),
      sendEachForMulticast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushSenderService,
        { provide: PrismaService, useValue: prisma },
        { provide: FirebaseAdminService, useValue: firebase },
      ],
    }).compile();

    service = module.get<PushSenderService>(PushSenderService);
  });

  const payload = { title: '기록할 시간이에요', body: '30초면 충분해요.' };

  it('발송 비활성(Firebase 미초기화)이면 아무것도 하지 않는다', async () => {
    firebase.isEnabled.mockReturnValue(false);

    await service.send('1', payload);

    expect(prisma.pushToken.findMany).not.toHaveBeenCalled();
    expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('등록된 토큰이 없으면 발송하지 않는다', async () => {
    prisma.pushToken.findMany.mockResolvedValue([]);

    await service.send('1', payload);

    expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('유저의 모든 기기 토큰으로 발송한다(멀티 기기)', async () => {
    prisma.pushToken.findMany.mockResolvedValue([
      { token: 'tok-A' },
      { token: 'tok-B' },
    ]);
    firebase.sendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    });

    await service.send('1', { ...payload, link: 'https://app/home' });

    expect(prisma.pushToken.findMany).toHaveBeenCalledWith({
      where: { userId: 1n },
      select: { token: true },
    });
    expect(firebase.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['tok-A', 'tok-B'],
      notification: { title: payload.title, body: payload.body },
      webpush: { fcmOptions: { link: 'https://app/home' } },
    });
    expect(prisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it('무효/만료 토큰은 발송 후 저장소에서 제거한다', async () => {
    prisma.pushToken.findMany.mockResolvedValue([
      { token: 'tok-valid' },
      { token: 'tok-dead' },
    ]);
    firebase.sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });

    await service.send('1', payload);

    // 죽은 토큰만 정확히 삭제
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['tok-dead'] } },
    });
  });

  it('일시적 오류(무효 토큰 아님)는 토큰을 삭제하지 않는다', async () => {
    prisma.pushToken.findMany.mockResolvedValue([{ token: 'tok-A' }]);
    firebase.sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });

    await service.send('1', payload);

    expect(prisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });
});
