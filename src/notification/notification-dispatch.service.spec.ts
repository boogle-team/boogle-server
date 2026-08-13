import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { PushSenderService } from '@/push/push-sender.service';
import { NotificationCreationService } from './notification-creation.service';
import { NotificationDispatchService } from './notification-dispatch.service';

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let prisma: { member: { findUnique: jest.Mock } };
  let creation: { create: jest.Mock };
  let pushSender: { send: jest.Mock };

  beforeEach(async () => {
    prisma = { member: { findUnique: jest.fn() } };
    creation = { create: jest.fn().mockResolvedValue({ id: 5001 }) };
    pushSender = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationCreationService, useValue: creation },
        { provide: PushSenderService, useValue: pushSender },
      ],
    }).compile();

    service = module.get<NotificationDispatchService>(
      NotificationDispatchService,
    );
  });

  it('설정이 켜져 있으면 인앱 알림 생성과 푸시를 모두 수행하고 pushSent:true를 반환한다', async () => {
    prisma.member.findUnique.mockResolvedValue({ reportAlarm: 'Y' });

    await expect(service.dispatch('1', 'REPORT_READY')).resolves.toEqual({
      notificationId: 5001,
      pushSent: true,
    });

    expect(creation.create).toHaveBeenCalledWith({
      userId: '1',
      type: 'REPORT_READY',
      params: undefined,
    });
    expect(pushSender.send).toHaveBeenCalledWith('1', {
      notificationId: 5001,
      title: '이번 주 리포트가 도착했어요',
      body: '이번 주 패턴을 확인해보세요',
      type: 'REPORT_READY',
      linkTo: 'REPORT',
    });
  });

  it('설정이 N이면 인앱 알림은 생성하되 푸시는 보내지 않고 pushSent:false를 반환한다', async () => {
    prisma.member.findUnique.mockResolvedValue({ warnAlarm: 'N' });

    await expect(
      service.dispatch('1', 'WARNING', { color: '붉은색' }),
    ).resolves.toEqual({ notificationId: 5001, pushSent: false });

    // 설정과 무관하게 알림 목록에는 남아야 한다.
    expect(creation.create).toHaveBeenCalledWith({
      userId: '1',
      type: 'WARNING',
      params: { color: '붉은색' },
    });
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('설정값이 null(레거시)이면 기본값 Y로 보고 푸시한다', async () => {
    prisma.member.findUnique.mockResolvedValue({ reportAlarm: null });

    await service.dispatch('1', 'PDF_SAVED');

    expect(pushSender.send).toHaveBeenCalled();
  });

  it('PDF_SAVED는 reportAlarm 설정을 따른다', async () => {
    prisma.member.findUnique.mockResolvedValue({ reportAlarm: 'N' });

    await service.dispatch('1', 'PDF_SAVED');

    expect(creation.create).toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('푸시 발송이 실패해도 예외를 전파하지 않는다(인앱 알림은 이미 생성됨)', async () => {
    prisma.member.findUnique.mockResolvedValue({ reportAlarm: 'Y' });
    pushSender.send.mockRejectedValue(new Error('FCM down'));

    // 예외는 삼키되, 푸시가 안 갔다는 사실은 pushSent:false로 알린다.
    await expect(service.dispatch('1', 'REPORT_READY')).resolves.toEqual({
      notificationId: 5001,
      pushSent: false,
    });
    expect(creation.create).toHaveBeenCalled();
  });

  it('템플릿 파라미터를 치환해 푸시 문구를 만든다', async () => {
    prisma.member.findUnique.mockResolvedValue({ warnAlarm: 'Y' });

    await service.dispatch('1', 'WARNING', { color: '검은색' });

    expect(pushSender.send).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        body: expect.stringContaining('검은색') as string,
        linkTo: 'GUIDE_WARNING',
      }),
    );
  });
});
