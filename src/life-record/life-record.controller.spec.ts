import { Test, TestingModule } from '@nestjs/testing';
import { LifeRecordController } from './life-record.controller';

describe('LifeRecordController', () => {
  let controller: LifeRecordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeRecordController],
    }).compile();

    controller = module.get<LifeRecordController>(LifeRecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
