import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { LifeRecordService } from './life-record.service';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';
import { LifeRecordErrorCode } from './life-record-error-code.enum';

describe('LifeRecordService', () => {
  let service: LifeRecordService;
  let prisma: {
    lifeRecord: Record<string, jest.Mock>;
    food: Record<string, jest.Mock>;
    medicine: Record<string, jest.Mock>;
    tag: Record<string, jest.Mock>;
    lifeTag: Record<string, jest.Mock>;
    lifeFoodTag: Record<string, jest.Mock>;
    medicineMap: Record<string, jest.Mock>;
  };
  let geminiTagExtractor: { extractTags: jest.Mock };

  const baseRecord = {
    id: 15n,
    userId: 1n,
    regDate: new Date('2026-07-02T00:00:00.000Z'),
    sleep: 'B',
    stress: 'H',
    water: 'N',
    mealRegular: 'I',
    memo: '메모',
    autoTags: '야식',
    sleepTime: 2,
    exercise: 'N',
    caffeine: 'O',
    outing: 'N',
    hormone: null,
    status: 'A',
    updateTime: null,
    lifeTags: [{ tag: { id: 1n, name: '야식' } }],
    foodTags: [{ food: { id: 1, name: '자극적인 음식' } }],
    medicineMaps: [{ medicine: { id: 1, name: '감기약' } }],
  };

  beforeEach(async () => {
    prisma = {
      lifeRecord: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      food: { findMany: jest.fn() },
      medicine: { findMany: jest.fn() },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      lifeTag: { deleteMany: jest.fn() },
      lifeFoodTag: { deleteMany: jest.fn() },
      medicineMap: { deleteMany: jest.fn() },
    };
    geminiTagExtractor = { extractTags: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifeRecordService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiTagExtractorService, useValue: geminiTagExtractor },
      ],
    }).compile();

    service = module.get<LifeRecordService>(LifeRecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('regDate 형식이 올바르지 않으면 INVALID_DATE_FORMAT을 던진다', async () => {
      await expect(
        service.create('1', { regDate: '2026/07/02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_DATE_FORMAT,
      });
    });

    it('생활 값이 두 글자 이상이면 INVALID_LIFE_VALUE를 던진다', async () => {
      await expect(
        service.create('1', {
          regDate: '2026-07-02',
          sleep: 'BB',
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_LIFE_VALUE,
      });
    });

    it('한 글자여도 필드별 허용 코드가 아니면 INVALID_LIFE_VALUE를 던진다', async () => {
      await expect(
        service.create('1', {
          regDate: '2026-07-02',
          sleep: 'A',
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_LIFE_VALUE,
      });
    });

    it('같은 날짜의 기록이 이미 있으면 LIFE_RECORD_ALREADY_EXISTS를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(baseRecord);

      await expect(
        service.create('1', { regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
      });
    });

    it('정상 생성 시 매핑된 상세 응답을 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockResolvedValue(baseRecord);

      const result = await service.create('1', {
        regDate: '2026-07-02',
        tagNames: ['야식'],
        foodIds: [1],
      });

      expect(result.id).toBe(15);
      expect(result.regDate).toBe('2026-07-02');
      expect(result.tagNames).toEqual(['야식']);
      expect(result.foods).toEqual([{ id: 1, name: '자극적인 음식' }]);
    });

    it('DB 저장 중 오류가 발생하면 LIFE_RECORD_CREATE_FAILED를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([]);
      prisma.lifeRecord.create.mockRejectedValue(new Error('db error'));

      await expect(
        service.create('1', { regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_CREATE_FAILED,
      });
    });
  });

  describe('extractTags', () => {
    it('text가 없으면 TEXT_REQUIRED를 던진다', async () => {
      await expect(service.extractTags(undefined)).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.TEXT_REQUIRED,
      });
    });

    it('text가 255자를 초과하면 TEXT_TOO_LONG을 던진다', async () => {
      await expect(service.extractTags('a'.repeat(256))).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.TEXT_TOO_LONG,
      });
    });

    it('정상 입력 시 기존 태그 목록과 함께 Gemini에 전달하고 결과를 매핑해 반환한다', async () => {
      prisma.tag.findMany.mockResolvedValue([{ name: '야식' }]);
      geminiTagExtractor.extractTags.mockResolvedValue([
        { name: '수면 부족', confidence: 0.94 },
      ]);

      const result = await service.extractTags('어제 잠을 못 잤다.');

      expect(geminiTagExtractor.extractTags).toHaveBeenCalledWith(
        '어제 잠을 못 잤다.',
        ['야식'],
      );
      expect(result.tagNames).toEqual(['수면 부족']);
      expect(result.autoTags).toBe('수면 부족');
    });
  });

  describe('findOne', () => {
    it('기록이 없으면 LIFE_RECORD_NOT_FOUND를 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(null);

      await expect(service.findOne('1', 15)).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_NOT_FOUND,
      });
    });

    it('소유자가 다르면 LIFE_RECORD_FORBIDDEN을 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue({
        ...baseRecord,
        userId: 999n,
      });

      await expect(service.findOne('1', 15)).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN,
      });
    });

    it('정상 조회 시 상세 응답을 반환한다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);

      const result = await service.findOne('1', 15);

      expect(result.id).toBe(15);
      expect(result.userId).toBe(1);
    });
  });

  describe('remove', () => {
    it('정상 삭제 시 status를 D로 변경하고 null을 반환한다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.lifeRecord.update.mockResolvedValue({
        ...baseRecord,
        status: 'D',
      });

      const result = await service.remove('1', 15);

      expect(result).toBeNull();
      const [[callArgs]] = prisma.lifeRecord.update.mock.calls as [
        [{ where: { id: bigint }; data: { status: string } }],
      ];
      expect(callArgs.where).toEqual({ id: 15n });
      expect(callArgs.data.status).toBe('D');
    });
  });
});
