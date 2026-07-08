import { Test, TestingModule } from '@nestjs/testing';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';

describe('FoodController', () => {
  let controller: FoodController;
  let service: { findAll: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodController],
      providers: [{ provide: FoodService, useValue: service }],
    }).compile();

    controller = module.get<FoodController>(FoodController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll은 keyword를 서비스에 위임한다', () => {
    controller.findAll(1, { keyword: '카페인' });
    expect(service.findAll).toHaveBeenCalledWith('카페인');
  });
});
