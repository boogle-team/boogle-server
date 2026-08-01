import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationErrorCode } from './notification-error-code.enum';
import { NotificationCreationService } from './notification-creation.service';

describe('NotificationCreationService', () => {
  let service: NotificationCreationService;
  let tx: {
    alarm: { create: jest.Mock };
    alarmMap: { create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    tx = {
      alarm: { create: jest.fn() },
      alarmMap: { create: jest.fn() },
    };
    // $transaction(cb)는 콜백에 트랜잭션 클라이언트를 넘겨 실행한다.
    prisma = {
      $transaction: jest.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCreationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationCreationService>(
      NotificationCreationService,
    );
  });

  it('고정 문구 유형(RECORD_REMINDER)은 params 없이 alarm+alarm_map을 생성한다', async () => {
    tx.alarm.create.mockResolvedValue({ id: 10 });
    tx.alarmMap.create.mockResolvedValue({ id: 100n });

    const result = await service.create({
      userId: '1',
      type: 'RECORD_REMINDER',
    });

    expect(result).toEqual({ id: 100 });
    expect(tx.alarm.create).toHaveBeenCalledWith({
      data: {
        category: 'R',
        type: 'RECORD_REMINDER',
        title: '기록할 시간이에요',
        content: '30초면 충분해요. 지금 기록해볼까요?',
      },
    });
    expect(tx.alarmMap.create).toHaveBeenCalledWith({
      data: { userId: 1n, alarmId: 10, isRead: 'N' },
    });
  });

  it('파라미터 유형(STREAK)은 {days}를 치환해 저장한다', async () => {
    tx.alarm.create.mockResolvedValue({ id: 11 });
    tx.alarmMap.create.mockResolvedValue({ id: 101n });

    await service.create({ userId: 1, type: 'STREAK', params: { days: 3 } });

    expect(tx.alarm.create).toHaveBeenCalledWith({
      data: {
        category: 'R',
        type: 'STREAK',
        title: '3일째 기록 중이에요!',
        content: '꾸준한 기록이 패턴 분석의 기본이에요',
      },
    });
  });

  it('WARNING의 {color}를 치환한다', async () => {
    tx.alarm.create.mockResolvedValue({ id: 12 });
    tx.alarmMap.create.mockResolvedValue({ id: 102n });

    await service.create({
      userId: '1',
      type: 'WARNING',
      params: { color: '붉은색' },
    });

    expect(tx.alarm.create).toHaveBeenCalledWith({
      data: {
        category: 'W',
        type: 'WARNING',
        title: '주의가 필요한 기록이 있어요',
        content:
          '오늘 기록에서 붉은색 변이 감지됐어요. 가이드 탭에서 자세한 안내를 확인해보세요.',
      },
    });
  });

  it('STREAK의 days 누락 시 NOTIFICATION_INVALID_PARAMS(500)를 던지고 alarm을 생성하지 않는다', async () => {
    await expect(
      service.create({ userId: '1', type: 'STREAK' }),
    ).rejects.toMatchObject({
      errorCode: NotificationErrorCode.NOTIFICATION_INVALID_PARAMS,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    expect(tx.alarm.create).not.toHaveBeenCalled();
  });

  it('WARNING의 color 누락 시 NOTIFICATION_INVALID_PARAMS를 던진다', async () => {
    await expect(
      service.create({ userId: '1', type: 'WARNING' }),
    ).rejects.toMatchObject({
      errorCode: NotificationErrorCode.NOTIFICATION_INVALID_PARAMS,
    });
    expect(tx.alarm.create).not.toHaveBeenCalled();
  });
});
