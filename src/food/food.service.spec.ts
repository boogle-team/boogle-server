import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { FoodService } from './food.service';
import { FoodErrorCode } from './food-error-code.enum';

describe('FoodService', () => {
  let service: FoodService;
  let prisma: { food: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { food: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FoodService>(FoodService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('음식 목록을 id/name 형태로 반환한다', async () => {
    prisma.food.findMany.mockResolvedValue([
      { id: 1, name: '자극적인 음식' },
      { id: 2, name: '기름진 음식' },
    ]);

    const result = await service.findAll();

    expect(result).toEqual({
      items: [
        { id: 1, name: '자극적인 음식' },
        { id: 2, name: '기름진 음식' },
      ],
    });
  });

  it('조회 중 오류가 발생하면 FOOD_LIST_READ_FAILED를 던진다', async () => {
    prisma.food.findMany.mockRejectedValue(new Error('db error'));

    await expect(service.findAll()).rejects.toMatchObject({
      errorCode: FoodErrorCode.FOOD_LIST_READ_FAILED,
    });
  });

  it('keyword가 있으면 이름 부분 일치로 조회한다', async () => {
    prisma.food.findMany.mockResolvedValue([{ id: 3, name: '카페인' }]);

    await service.findAll('카페인');

    expect(prisma.food.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: '카페인' } },
      }),
    );
  });
});
