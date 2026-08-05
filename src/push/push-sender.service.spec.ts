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

  const payload = {
    notificationId: 123,
    title: '기록할 시간이에요',
    body: '30초면 충분해요.',
    type: 'RECORD_REMINDER' as const,
    linkTo: 'HOME' as const,
  };

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

    await service.send('1', payload);

    expect(prisma.pushToken.findMany).toHaveBeenCalledWith({
      where: { userId: 1n },
      select: { token: true },
    });
    // data-only 메시지: notification 필드 없이 data에 모두 문자열로 담는다.
    expect(firebase.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['tok-A', 'tok-B'],
      data: {
        notificationId: '123',
        title: payload.title,
        body: payload.body,
        type: 'RECORD_REMINDER',
        linkTo: 'HOME',
      },
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

    // 죽은 토큰만, 그리고 현재 소유자(userId)로 스코프해 삭제
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1n, token: { in: ['tok-dead'] } },
    });
  });

  it('invalid-argument는 무효 토큰이 아니므로 삭제하지 않는다', async () => {
    // invalid-argument는 메시지 인자 문제에서도 발생 → 토큰을 지우면 안 됨
    prisma.pushToken.findMany.mockResolvedValue([{ token: 'tok-A' }]);
    firebase.sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/invalid-argument' } },
      ],
    });

    await service.send('1', payload);

    expect(prisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it('토큰이 500개를 넘으면 여러 번 나눠 발송한다', async () => {
    const tokens = Array.from({ length: 501 }, (_, i) => ({
      token: `tok-${i}`,
    }));
    prisma.pushToken.findMany.mockResolvedValue(tokens);
    firebase.sendEachForMulticast.mockImplementation(
      (message: { tokens: string[] }) => ({
        responses: message.tokens.map(() => ({ success: true })),
      }),
    );

    await service.send('1', payload);

    // 501개 → 500 + 1로 두 번 호출
    expect(firebase.sendEachForMulticast).toHaveBeenCalledTimes(2);
    const calls = firebase.sendEachForMulticast.mock.calls as Array<
      [{ tokens: string[] }]
    >;
    expect(calls[0][0].tokens).toHaveLength(500);
    expect(calls[1][0].tokens).toHaveLength(1);
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
