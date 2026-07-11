import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

describe('HomeController', () => {
  let controller: HomeController;
  let service: { getHome: jest.Mock };

  beforeEach(async () => {
    service = { getHome: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: service }],
    }).compile();

    controller = module.get<HomeController>(HomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHome은 로그인 사용자 id와 date 쿼리를 그대로 서비스에 전달한다', async () => {
    await controller.getHome({ id: 1n }, { date: '2026-05-12' });

    expect(service.getHome).toHaveBeenCalledWith(1n, '2026-05-12');
  });

  it('date 쿼리가 없으면 undefined로 전달한다', async () => {
    await controller.getHome({ id: 1n }, {});

    expect(service.getHome).toHaveBeenCalledWith(1n, undefined);
  });

  it('getHome은 서비스에서 발생한 예외를 그대로 전파한다', async () => {
    service.getHome.mockRejectedValueOnce(new Error('boom'));

    await expect(
      controller.getHome({ id: 1n }, { date: '2026-05-12' }),
    ).rejects.toThrow('boom');
  });

  describe('라우트 레벨 검증 (ValidationPipe + StubAuthGuard)', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HomeController],
        providers: [{ provide: HomeService, useValue: service }],
      }).compile();

      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('date가 YYYY-MM-DD 형식이 아니면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/home')
        .query({ date: '2026-05-12T00:00:00Z' })
        .expect(400);

      expect(service.getHome).not.toHaveBeenCalled();
    });

    it('date가 없으면 인증(StubAuthGuard) 통과 후 서비스가 호출된다', async () => {
      service.getHome.mockResolvedValueOnce({});

      await request(app.getHttpServer()).get('/home').expect(200);

      expect(service.getHome).toHaveBeenCalledWith(1n, undefined);
    });
  });
});
