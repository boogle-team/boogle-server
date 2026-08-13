import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { PushController } from './push.controller';
import { PushService } from './push.service';

type SupertestApp = Parameters<typeof request>[0];

const jwtAuthGuard = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    req.user = { id: '1' };
    return true;
  },
};

describe('PushController', () => {
  let controller: PushController;
  let service: { registerToken: jest.Mock; deleteToken: jest.Mock };

  beforeEach(async () => {
    service = { registerToken: jest.fn(), deleteToken: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushController],
      providers: [{ provide: PushService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuard)
      .compile();

    controller = module.get<PushController>(PushController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('registerToken은 로그인 사용자 id와 token을 서비스에 전달한다', async () => {
    await controller.registerToken({ id: '1' }, { token: 'fcm-abc' });

    expect(service.registerToken).toHaveBeenCalledWith('1', 'fcm-abc');
  });

  it('deleteToken은 로그인 사용자 id와 token을 서비스에 전달한다', async () => {
    await controller.deleteToken({ id: '1' }, { token: 'fcm-abc' });

    expect(service.deleteToken).toHaveBeenCalledWith('1', 'fcm-abc');
  });

  describe('라우트 레벨 검증', () => {
    let app: INestApplication<SupertestApp>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PushController],
        providers: [{ provide: PushService, useValue: service }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue(jwtAuthGuard)
        .compile();

      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('정상 토큰이면 JWT 사용자로 서비스가 호출된다', async () => {
      service.registerToken.mockResolvedValueOnce({ token: 'fcm-abc' });

      await request(app.getHttpServer())
        .post('/push/tokens')
        .send({ token: 'fcm-abc' })
        .expect(201);

      expect(service.registerToken).toHaveBeenCalledWith('1', 'fcm-abc');
    });

    it('token이 비어있으면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .send({ token: '' })
        .expect(400);

      expect(service.registerToken).not.toHaveBeenCalled();
    });

    it('token 필드가 없으면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .send({})
        .expect(400);

      expect(service.registerToken).not.toHaveBeenCalled();
    });

    it('DELETE는 정상 토큰이면 200과 { deleted: true } 본문을 반환한다', async () => {
      service.deleteToken.mockResolvedValueOnce({ deleted: true });

      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: 'fcm-abc' })
        .expect(200, { deleted: true });

      expect(service.deleteToken).toHaveBeenCalledWith('1', 'fcm-abc');
    });

    it('DELETE는 이미 없던 토큰이어도 200과 { deleted: false }를 반환한다(멱등)', async () => {
      service.deleteToken.mockResolvedValueOnce({ deleted: false });

      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: 'fcm-abc' })
        .expect(200, { deleted: false });

      expect(service.deleteToken).toHaveBeenCalledWith('1', 'fcm-abc');
    });

    it('DELETE는 token이 비어있으면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: '' })
        .expect(400);

      expect(service.deleteToken).not.toHaveBeenCalled();
    });

    it('DELETE는 token이 문자열이 아니면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: 123 })
        .expect(400);

      expect(service.deleteToken).not.toHaveBeenCalled();
    });

    it('DELETE는 token이 512자를 초과하면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .delete('/push/tokens')
        .send({ token: 'a'.repeat(513) })
        .expect(400);

      expect(service.deleteToken).not.toHaveBeenCalled();
    });
  });

  describe('인증 실패 (401)', () => {
    let app: INestApplication<SupertestApp>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PushController],
        providers: [{ provide: PushService, useValue: service }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate() {
            throw new UnauthorizedException();
          },
        })
        .compile();

      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('토큰이 없으면 401을 반환하고 서비스를 호출하지 않는다', async () => {
      await request(app.getHttpServer())
        .post('/push/tokens')
        .send({ token: 'fcm-abc' })
        .expect(401);

      expect(service.registerToken).not.toHaveBeenCalled();
    });
  });
});
