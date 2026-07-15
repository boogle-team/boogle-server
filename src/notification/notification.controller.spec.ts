import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

// supertest의 request()가 받는 서버 타입을 그대로 재사용해
// INestApplication의 제네릭을 좁힌다 (getHttpServer()가 any가 되는 것 방지).
type SupertestApp = Parameters<typeof request>[0];

const jwtAuthGuard = {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    request.user = { id: '1' };
    return true;
  },
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: { getNotifications: jest.Mock };

  beforeEach(async () => {
    service = { getNotifications: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuard)
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getNotifications는 로그인 사용자 id를 그대로 서비스에 전달한다', async () => {
    await controller.getNotifications({ id: '1' });

    expect(service.getNotifications).toHaveBeenCalledWith('1');
  });

  it('getNotifications는 서비스에서 발생한 예외를 그대로 전파한다', async () => {
    service.getNotifications.mockRejectedValueOnce(new Error('boom'));

    await expect(controller.getNotifications({ id: '1' })).rejects.toThrow(
      'boom',
    );
  });

  describe('라우트 레벨 검증 (JwtAuthGuard)', () => {
    let app: INestApplication<SupertestApp>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [NotificationController],
        providers: [{ provide: NotificationService, useValue: service }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(jwtAuthGuard)
        .compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('JWT 인증 사용자(id=1)로 서비스가 호출된다', async () => {
      service.getNotifications.mockResolvedValueOnce({
        unreadCount: 0,
        notifications: [],
      });

      await request(app.getHttpServer()).get('/notifications').expect(200);

      expect(service.getNotifications).toHaveBeenCalledWith('1');
    });
  });
});
