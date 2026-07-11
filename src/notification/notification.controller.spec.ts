import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: { getNotifications: jest.Mock };

  beforeEach(async () => {
    service = { getNotifications: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: service }],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getNotifications는 로그인 사용자 id를 그대로 서비스에 전달한다', async () => {
    await controller.getNotifications({ id: 1n });

    expect(service.getNotifications).toHaveBeenCalledWith(1n);
  });

  it('getNotifications는 서비스에서 발생한 예외를 그대로 전파한다', async () => {
    service.getNotifications.mockRejectedValueOnce(new Error('boom'));

    await expect(controller.getNotifications({ id: 1n })).rejects.toThrow(
      'boom',
    );
  });

  describe('라우트 레벨 검증 (StubAuthGuard)', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [NotificationController],
        providers: [{ provide: NotificationService, useValue: service }],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('인증(StubAuthGuard) 통과 후 서비스가 기본 사용자(id=1)로 호출된다', async () => {
      service.getNotifications.mockResolvedValueOnce({
        unreadCount: 0,
        notifications: [],
      });

      await request(app.getHttpServer()).get('/notifications').expect(200);

      expect(service.getNotifications).toHaveBeenCalledWith(1n);
    });
  });
});
