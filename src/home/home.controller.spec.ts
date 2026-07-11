import { Test, TestingModule } from '@nestjs/testing';
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
});
