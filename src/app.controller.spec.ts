import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      const result = appController.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('DB에 연결되면 ok 상태를 반환한다', async () => {
      prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await appController.getHealth();

      expect(result).toEqual({ status: 'ok' });
    });

    it('DB 연결에 실패하면 예외를 전파한다', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(appController.getHealth()).rejects.toThrow(
        'connection refused',
      );
    });
  });
});
