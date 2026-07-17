import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MedicineController } from './medicine.controller';
import { MedicineService } from './medicine.service';
import { MedicineErrorCode } from './medicine-error-code.enum';

describe('MedicineController', () => {
  let controller: MedicineController;
  let service: { findAll: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicineController],
      providers: [
        { provide: MedicineService, useValue: service },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MedicineController>(MedicineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll은 keyword를 서비스에 위임한다', async () => {
    await controller.findAll({ id: '1' }, { keyword: '유산균' });
    expect(service.findAll).toHaveBeenCalledWith('유산균');
  });

  it('일치하는 약/영양제가 없으면 빈 목록을 그대로 반환한다', async () => {
    service.findAll.mockResolvedValue({ items: [] });

    const result = await controller.findAll(
      { id: '1' },
      { keyword: '존재하지않는약' },
    );

    expect(result).toEqual({ items: [] });
  });

  it('서비스에서 던진 BusinessException을 그대로 전파한다', async () => {
    const error = new BusinessException(
      MedicineErrorCode.MEDICINE_LIST_READ_FAILED,
      '약/영양제 목록 조회 중 오류가 발생했습니다.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    service.findAll.mockRejectedValue(error);

    await expect(controller.findAll({ id: '1' }, {})).rejects.toBe(error);
  });
});
