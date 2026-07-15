import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';

describe('RecordController', () => {
  let controller: RecordController;

  const mockRecordService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [
        {
          provide: RecordService,
          useValue: mockRecordService,
        },
      ],
    }).compile();

    controller = module.get<RecordController>(RecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create()가 service.create를 호출한다', async () => {
    const dto = { regDate: '2026-07-10', hasBowel: false };

    await controller.create('1', dto);

    expect(mockRecordService.create).toHaveBeenCalledWith(1, dto);
  });
});
