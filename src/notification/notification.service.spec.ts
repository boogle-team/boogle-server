import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    alarmMap: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      alarmMap: { findMany: jest.fn(), count: jest.fn() },
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

    const result = await service.getNotifications(1n);

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
          title: '이번 주 리포트가 도착했어요',
          content: '이번 주 패턴을 확인해보세요',
        },
      },
    ]);
    prisma.alarmMap.count.mockResolvedValue(1);

    const result = await service.getNotifications(1n);

    expect(result.unreadCount).toBe(1);
    expect(result.notifications).toHaveLength(3);
    expect(result.notifications[0]).toMatchObject({
      id: 5001,
      category: 'W',
      linkTo: 'GUIDE_WARNING',
      isRead: false,
    });
    expect(result.notifications[1]).toMatchObject({
      category: 'R',
      linkTo: 'HOME',
      isRead: true,
    });
    expect(result.notifications[2]).toMatchObject({
      category: 'P',
      linkTo: 'REPORT',
      isRead: true,
    });
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

    const result = await service.getNotifications(1n);

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

    const result = await service.getNotifications(1n);

    expect(result.notifications).toHaveLength(0);
  });

  it('목록 조회에 상한(take)을 걸고, unreadCount는 별도 count 쿼리로 정확히 구한다', async () => {
    prisma.alarmMap.findMany.mockResolvedValue([]);
    prisma.alarmMap.count.mockResolvedValue(7);

    const result = await service.getNotifications(1n);

    expect(result.unreadCount).toBe(7);
    expect(prisma.alarmMap.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    expect(prisma.alarmMap.count).toHaveBeenCalledWith({
      where: { userId: 1n, isRead: 'N' },
    });
  });
});
