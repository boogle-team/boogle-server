import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { MedicineService } from './medicine.service';
import { MedicineErrorCode } from './medicine-error-code.enum';

describe('MedicineService', () => {
  let service: MedicineService;
  let prisma: { medicine: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { medicine: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicineService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MedicineService>(MedicineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('약/영양제 목록을 id/name 형태로 반환한다', async () => {
    prisma.medicine.findMany.mockResolvedValue([
      { id: 1, name: '감기약' },
      { id: 2, name: '항생제' },
    ]);

    const result = await service.findAll();

    expect(result).toEqual({
      items: [
        { id: 1, name: '감기약' },
        { id: 2, name: '항생제' },
      ],
    });
  });

  it('name이 null이면 빈 문자열로 반환한다', async () => {
    prisma.medicine.findMany.mockResolvedValue([{ id: 6, name: null }]);

    const result = await service.findAll();

    expect(result).toEqual({ items: [{ id: 6, name: '' }] });
  });

  it('조회 중 오류가 발생하면 MEDICINE_LIST_READ_FAILED를 던진다', async () => {
    prisma.medicine.findMany.mockRejectedValue(new Error('db error'));

    await expect(service.findAll()).rejects.toMatchObject({
      errorCode: MedicineErrorCode.MEDICINE_LIST_READ_FAILED,
    });
  });

  it('keyword가 있으면 이름 부분 일치로 조회한다', async () => {
    prisma.medicine.findMany.mockResolvedValue([{ id: 3, name: '유산균' }]);

    await service.findAll('유산균');

    expect(prisma.medicine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: '유산균' } },
      }),
    );
  });
});
