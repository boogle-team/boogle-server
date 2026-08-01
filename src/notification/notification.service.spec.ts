import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationErrorCode } from './notification-error-code.enum';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    alarmMap: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      alarmMap: {
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('기록이 없으면 빈 목록과 unreadCount 0을 반환한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([]);
    prisma.alarmMap.count.mockResolvedValue(0);

    const result = await service.getNotifications('1');

    expect(result).toEqual({ unreadCount: 0, notifications: [] });
  });

  it('category별로 linkTo를 매핑하고 isRead를 boolean으로 변환한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([
      {
        id: 5001n,
        regDate: new Date('2026-05-12T14:32:00.000Z'),
        isRead: 'N',
        alarm: {
          category: 'W',
          type: 'WARNING',
          title: '주의가 필요한 기록이 있어요',
          content: '오늘 기록에서 붉은색 변이 감지됐어요.',
        },
      },
      {
        id: 5000n,
        regDate: new Date('2026-05-12T18:00:00.000Z'),
        isRead: 'Y',
        alarm: {
          category: 'R',
          type: 'RECORD_REMINDER',
          title: '기록할 시간이에요',
          content: '30초면 충분해요.',
        },
      },
      {
        id: 4999n,
        regDate: new Date('2026-05-11T06:20:00.000Z'),
        isRead: 'Y',
        alarm: {
          category: 'P',
          type: 'REPORT_READY',
          title: '이번 주 리포트가 도착했어요',
          content: '이번 주 패턴을 확인해보세요',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications('1');

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(3);
    expect(result.notifications[0]).toMatchObject({
      id: 5001,
      category: 'W',
      type: 'WARNING',
      linkTo: 'GUIDE_WARNING',
      isRead: false,
    });
    expect(result.notifications[1]).toMatchObject({
      category: 'R',
      type: 'RECORD_REMINDER',
      linkTo: 'HOME',
      isRead: true,
    });
    expect(result.notifications[2]).toMatchObject({
      category: 'P',
      type: 'REPORT_READY',
      linkTo: 'REPORT',
      isRead: true,
    });
  });

  it('alarm.type이 없으면 type을 null로 반환한다(구 데이터 폴백)', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([
      {
        id: 5002n,
        regDate: new Date('2026-05-12T14:32:00.000Z'),
        isRead: 'N',
        alarm: {
          category: 'R',
          type: null,
          title: '기록할 시간이에요',
          content: '30초면 충분해요.',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications('1');

    expect(result.notifications[0].type).toBeNull();
    expect(result.notifications[0].linkTo).toBe('HOME');
  });

  it('alarm.type이 계약(5종) 밖의 값이면 type을 null로 폴백한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([
      {
        id: 5003n,
        regDate: new Date('2026-05-12T14:32:00.000Z'),
        isRead: 'N',
        alarm: {
          category: 'R',
          type: 'UNKNOWN_LEGACY_CODE',
          title: '기록할 시간이에요',
          content: '30초면 충분해요.',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications('1');

    expect(result.notifications[0].type).toBeNull();
  });

  it('alarm이 연결되지 않은 행(alarmId null)은 목록에서 제외한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([
      {
        id: 1n,
        regDate: new Date('2026-05-12T00:00:00.000Z'),
        isRead: 'N',
        alarm: null,
      },
      {
        id: 2n,
        regDate: new Date('2026-05-12T00:00:00.000Z'),
        isRead: 'N',
        alarm: {
          category: 'R',
          title: '기록할 시간이에요',
          content: '30초면 충분해요.',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications('1');

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].id).toBe(2);
  });

  it('regDate가 null인 행은 목록에서 제외한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([
      {
        id: 1n,
        regDate: null,
        isRead: 'N',
        alarm: {
          category: 'R',
          title: '기록할 시간이에요',
          content: '30초면 충분해요.',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications('1');

    expect(result.notifications).toHaveLength(0);
  });

  it('목록 조회에 상한(take)을 걸고, unreadCount는 별도 count 쿼리로 정확히 구한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([]);
    prisma.alarmMap.count.mockResolvedValue(7);

    const result = await service.getNotifications('1');

    expect(result.unreadCount).toBe(7);
    expect(prisma.alarmMap.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(prisma.alarmMap.count).toHaveBeenCalledWith({
      where: { userId: 1n, isRead: 'N' },
    });
  });

  describe('markAsRead', () => {
    it('본인 알림을 읽음 처리하고 id/isRead/갱신된 unreadCount를 반환한다', async () => {
      prisma.alarmMap.updateMany.mockResolvedValue({ count: 1 });
      prisma.alarmMap.count.mockResolvedValue(2);

      const result = await service.markAsRead('1', 5001);

      expect(result).toEqual({ id: 5001, isRead: true, unreadCount: 2 });
      // 소유 검증: id + userId로만 갱신 (isRead는 where에 없음 → 멱등)
      expect(prisma.alarmMap.updateMany).toHaveBeenCalledWith({
        where: { id: 5001n, userId: 1n },
        data: { isRead: 'Y' },
      });
      expect(prisma.alarmMap.count).toHaveBeenCalledWith({
        where: { userId: 1n, isRead: 'N' },
      });
    });

    it('이미 읽은 알림도 멱등하게 처리한다(매칭되므로 정상 응답)', async () => {
      prisma.alarmMap.updateMany.mockResolvedValue({ count: 1 });
      prisma.alarmMap.count.mockResolvedValue(0);

      const result = await service.markAsRead('1', 5001);

      expect(result).toEqual({ id: 5001, isRead: true, unreadCount: 0 });
    });

    it('존재하지 않거나 타인의 알림이면 NOTIFICATION_NOT_FOUND(404)를 던진다', async () => {
      prisma.alarmMap.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAsRead('1', 9999)).rejects.toMatchObject({
        errorCode: NotificationErrorCode.NOTIFICATION_NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
      // 매칭 0건이면 unreadCount 재조회 없이 즉시 종료한다.
      expect(prisma.alarmMap.count).not.toHaveBeenCalled();
    });
  });
});
