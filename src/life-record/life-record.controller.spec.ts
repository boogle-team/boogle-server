import { Test, TestingModule } from '@nestjs/testing';
import { LifeRecordController } from './life-record.controller';
import { LifeRecordService } from './life-record.service';

describe('LifeRecordController', () => {
  let controller: LifeRecordController;
  let service: {
    create: jest.Mock;
    extractTags: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      extractTags: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeRecordController],
      providers: [{ provide: LifeRecordService, useValue: service }],
    }).compile();

    controller = module.get<LifeRecordController>(LifeRecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create는 userId와 dto를 그대로 서비스에 위임한다', () => {
    const dto = { regDate: '2026-07-02' };
    controller.create(1, dto);
    expect(service.create).toHaveBeenCalledWith(1, dto);
  });

  it('extractTags는 dto.text를 서비스에 위임한다', () => {
    controller.extractTags(1, { text: '메모' });
    expect(service.extractTags).toHaveBeenCalledWith('메모');
  });

  it('findAll은 userId와 쿼리를 서비스에 위임한다', () => {
    const query = { page: 1, size: 10 };
    controller.findAll(1, query);
    expect(service.findAll).toHaveBeenCalledWith(1, query);
  });

  it('findOne은 userId와 lifeId를 서비스에 위임한다', () => {
    controller.findOne(1, 15);
    expect(service.findOne).toHaveBeenCalledWith(1, 15);
  });

  it('update는 userId, lifeId, dto를 서비스에 위임한다', () => {
    const dto = { memo: '수정' };
    controller.update(1, 15, dto);
    expect(service.update).toHaveBeenCalledWith(1, 15, dto);
  });

  it('remove는 userId와 lifeId를 서비스에 위임한다', () => {
    controller.remove(1, 15);
    expect(service.remove).toHaveBeenCalledWith(1, 15);
  });
});
