import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { PushSenderService } from '@/push/push-sender.service';
import { NotificationCreationService } from './notification-creation.service';
import {
  NotificationSchedulerService,
  calculateStreak,
} from './notification-scheduler.service';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let prisma: {
    member: { findMany: jest.Mock };
    boogleRecord: { findMany: jest.Mock };
  };
  let creation: { create: jest.Mock };
  let pushSender: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      member: { findMany: jest.fn() },
      boogleRecord: { findMany: jest.fn() },
    };
    creation = { create: jest.fn().mockResolvedValue({ id: 1 }) };
    pushSender = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationCreationService, useValue: creation },
        { provide: PushSenderService, useValue: pushSender },
      ],
    }).compile();

    service = module.get<NotificationSchedulerService>(
      NotificationSchedulerService,
    );
  });

  describe('calculateStreak', () => {
    it('오늘 포함 연속이면 그 길이를 반환한다', () => {
      const dates = new Set(['2026-05-10', '2026-05-11', '2026-05-12']);
      expect(calculateStreak('2026-05-12', dates)).toBe(3);
    });

    it('오늘 기록이 없으면 어제부터 센다', () => {
      const dates = new Set(['2026-05-10', '2026-05-11']);
      expect(calculateStreak('2026-05-12', dates)).toBe(2);
    });

    it('연속이 끊겨 있으면 최근 연속만 센다', () => {
      const dates = new Set(['2026-05-08', '2026-05-11', '2026-05-12']);
      expect(calculateStreak('2026-05-12', dates)).toBe(2);
    });

    it('최근 기록이 없으면 0이다', () => {
      const dates = new Set(['2026-05-01']);
      expect(calculateStreak('2026-05-12', dates)).toBe(0);
    });
  });

  describe('runRecordReminders', () => {
    it('오늘 기록이 없는 유저에게만 리마인더를 생성·발송한다', async () => {
      prisma.member.findMany.mockResolvedValue([
        { id: 1n },
        { id: 2n },
        { id: 3n },
      ]);
      // 유저 2만 오늘 기록함
      prisma.boogleRecord.findMany.mockResolvedValue([{ userId: 2n }]);

      await service.runRecordReminders('2026-05-12');

      // 1, 3에게만 발송 (2 제외)
      expect(creation.create).toHaveBeenCalledTimes(2);
      expect(pushSender.send).toHaveBeenCalledTimes(2);
      expect(creation.create).toHaveBeenCalledWith({
        userId: '1',
        type: 'RECORD_REMINDER',
      });
      expect(creation.create).toHaveBeenCalledWith({
        userId: '3',
        type: 'RECORD_REMINDER',
      });
      expect(creation.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: '2' }),
      );
    });

    it('기록 알림이 꺼지지 않은(null 포함) 활성 회원만 조회한다', async () => {
      prisma.member.findMany.mockResolvedValue([]);

      await service.runRecordReminders('2026-05-12');

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: {
          status: 'A',
          OR: [{ recordAlarm: { not: 'N' } }, { recordAlarm: null }],
        },
        select: { id: true },
      });
    });
  });

  describe('runStreakEncouragement', () => {
    it('연속 기록 중인 유저에게 며칠째인지 채워 발송한다', async () => {
      prisma.member.findMany.mockResolvedValue([{ id: 1n }]);
      prisma.boogleRecord.findMany.mockResolvedValue([
        { userId: 1n, regDate: new Date('2026-05-10T08:00:00.000+09:00') },
        { userId: 1n, regDate: new Date('2026-05-11T08:00:00.000+09:00') },
        { userId: 1n, regDate: new Date('2026-05-12T08:00:00.000+09:00') },
      ]);

      await service.runStreakEncouragement('2026-05-12');

      expect(creation.create).toHaveBeenCalledWith({
        userId: '1',
        type: 'STREAK',
        params: { days: 3 },
      });
      expect(pushSender.send).toHaveBeenCalledWith('1', {
        title: '3일째 기록 중이에요!',
        body: '꾸준한 기록이 패턴 분석의 기본이에요',
      });
    });

    it('연속 기록이 없는(streak 0) 유저는 발송하지 않는다', async () => {
      prisma.member.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
      // 유저 1은 최근 연속, 유저 2는 오래전 기록만
      prisma.boogleRecord.findMany.mockResolvedValue([
        { userId: 1n, regDate: new Date('2026-05-12T08:00:00.000+09:00') },
        { userId: 2n, regDate: new Date('2026-04-01T08:00:00.000+09:00') },
      ]);

      await service.runStreakEncouragement('2026-05-12');

      expect(creation.create).toHaveBeenCalledTimes(1);
      expect(creation.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: '1', type: 'STREAK' }),
      );
    });
  });
});
