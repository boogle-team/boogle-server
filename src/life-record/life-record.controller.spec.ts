import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { LifeRecordController } from './life-record.controller';
import { LifeRecordService } from './life-record.service';
import { LifeRecordErrorCode } from './life-record-error-code.enum';

describe('LifeRecordController', () => {
  let controller: LifeRecordController;
  let service: {
    create: jest.Mock;
    extractTags: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    getTodayTags: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: '1' };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      extractTags: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      getTodayTags: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeRecordController],
      providers: [
        { provide: LifeRecordService, useValue: service },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<LifeRecordController>(LifeRecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create는 userId와 dto를 그대로 서비스에 위임한다', async () => {
    const dto = {
      regDate: '2026-07-02',
      sleep: 'B',
      stress: 'H',
      water: 'N',
      mealRegular: 'I',
      foodIds: [1],
    };
    await controller.create(user, dto);
    expect(service.create).toHaveBeenCalledWith('1', dto);
  });

  it('extractTags는 dto.text를 서비스에 위임한다', async () => {
    await controller.extractTags(user, { text: '메모' });
    expect(service.extractTags).toHaveBeenCalledWith('메모');
  });

  it('findAll은 userId와 쿼리를 서비스에 위임한다', async () => {
    const query = { page: 1, size: 10 };
    await controller.findAll(user, query);
    expect(service.findAll).toHaveBeenCalledWith('1', query);
  });

  it('findOne은 userId와 lifeId를 서비스에 위임한다', async () => {
    await controller.findOne(user, 15);
    expect(service.findOne).toHaveBeenCalledWith('1', 15);
  });

  it('getTodayTags는 userId와 date를 서비스에 위임한다', async () => {
    await controller.getTodayTags(user, { date: '2026-07-02' });
    expect(service.getTodayTags).toHaveBeenCalledWith('1', '2026-07-02');
  });

  it('update는 userId, lifeId, dto를 서비스에 위임한다', async () => {
    const dto = { memo: '수정' };
    await controller.update(user, 15, dto);
    expect(service.update).toHaveBeenCalledWith('1', 15, dto);
  });

  it('remove는 userId와 lifeId를 서비스에 위임한다', async () => {
    await controller.remove(user, 15);
    expect(service.remove).toHaveBeenCalledWith('1', 15);
  });

  it('create는 서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
      '해당 날짜의 생활 기록이 이미 존재합니다.',
      HttpStatus.CONFLICT,
    );
    service.create.mockRejectedValue(error);

    await expect(
      controller.create(user, {
        regDate: '2026-07-02',
        sleep: 'B',
        stress: 'H',
        water: 'N',
        mealRegular: 'I',
        foodIds: [1],
      }),
    ).rejects.toBe(error);
  });

  it('getTodayTags는 서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      LifeRecordErrorCode.INVALID_DATE_FORMAT,
      '날짜 형식이 올바르지 않습니다.',
      HttpStatus.BAD_REQUEST,
    );
    service.getTodayTags.mockRejectedValue(error);

    await expect(
      controller.getTodayTags(user, { date: '2026/07/02' }),
    ).rejects.toBe(error);
  });

  it('findOne은 서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      LifeRecordErrorCode.LIFE_RECORD_NOT_FOUND,
      '생활 기록을 찾을 수 없습니다.',
      HttpStatus.NOT_FOUND,
    );
    service.findOne.mockRejectedValue(error);

    await expect(controller.findOne(user, 15)).rejects.toBe(error);
  });

  it('update는 서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN,
      '해당 기록에 접근할 권한이 없습니다.',
      HttpStatus.FORBIDDEN,
    );
    service.update.mockRejectedValue(error);

    await expect(controller.update(user, 15, { memo: '수정' })).rejects.toBe(
      error,
    );
  });

  it('remove는 서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      LifeRecordErrorCode.LIFE_RECORD_NOT_FOUND,
      '생활 기록을 찾을 수 없습니다.',
      HttpStatus.NOT_FOUND,
    );
    service.remove.mockRejectedValue(error);

    await expect(controller.remove(user, 15)).rejects.toBe(error);
  });
});
