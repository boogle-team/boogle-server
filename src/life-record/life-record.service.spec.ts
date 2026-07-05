import { Test, TestingModule } from '@nestjs/testing';
import { LifeRecordService } from './life-record.service';

describe('LifeRecordService', () => {
  let service: LifeRecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LifeRecordService],
    }).compile();

    service = module.get<LifeRecordService>(LifeRecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
