import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LifeRecordService } from './life-record.service';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';
import { LifeRecordErrorCode } from './life-record-error-code.enum';
import { CreateLifeRecordDto } from './dto/create-life-record.dto';
import { ReportSnapshotService } from '@/report/report-snapshot.service';

const validCreateFields: Pick<
  CreateLifeRecordDto,
  'sleep' | 'stress' | 'water' | 'mealRegular' | 'foodIds'
> = {
  sleep: 'B',
  stress: 'H',
  water: 'N',
  mealRegular: 'I',
  foodIds: [1],
};

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
    $transaction: jest.Mock;
  };
  let geminiTagExtractor: { extractTags: jest.Mock };

  let reportSnapshots: {
    invalidateByDateKey: jest.Mock;
  };

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
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : (arg as (tx: typeof prisma) => unknown)(prisma),
    );
    geminiTagExtractor = { extractTags: jest.fn() };

    reportSnapshots = {
      invalidateByDateKey: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifeRecordService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiTagExtractorService, useValue: geminiTagExtractor },
        { provide: ReportSnapshotService, useValue: reportSnapshots },
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
        service.create('1', { ...validCreateFields, regDate: '2026/07/02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_DATE_FORMAT,
      });
    });

    it('생활 값이 두 글자 이상이면 INVALID_LIFE_VALUE를 던진다', async () => {
      await expect(
        service.create('1', {
          ...validCreateFields,
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
          ...validCreateFields,
          regDate: '2026-07-02',
          sleep: 'A',
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_LIFE_VALUE,
      });
    });

    it('sleepTime이 1/2/3이 아니면 INVALID_LIFE_VALUE를 던진다', async () => {
      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
          sleepTime: 4,
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_LIFE_VALUE,
      });
    });

    it('같은 날짜의 기록이 이미 있으면 LIFE_RECORD_ALREADY_EXISTS를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(baseRecord);

      await expect(
        service.create('1', { ...validCreateFields, regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
      });
    });

    it('같은 날짜에 삭제(status=D)된 기록이 있으면 막지 않고 되살려서(update) 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        status: 'D',
      });
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.update.mockResolvedValue({
        ...baseRecord,
        status: 'A',
      });

      const result = await service.create('1', {
        ...validCreateFields,
        regDate: '2026-07-02',
        tagNames: ['야식'],
        foodIds: [1],
      });

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );

      expect(prisma.lifeRecord.create).not.toHaveBeenCalled();
      expect(prisma.lifeTag.deleteMany).toHaveBeenCalledWith({
        where: { lifeId: baseRecord.id },
      });
      expect(prisma.lifeFoodTag.deleteMany).toHaveBeenCalledWith({
        where: { lifeId: baseRecord.id },
      });
      expect(prisma.medicineMap.deleteMany).toHaveBeenCalledWith({
        where: { lifeRecordId: baseRecord.id },
      });

      const [[callArgs]] = prisma.lifeRecord.update.mock.calls as [
        [{ where: { id: bigint }; data: { status: string } }],
      ];
      expect(callArgs.where).toEqual({ id: baseRecord.id });
      expect(callArgs.data.status).toBe('A');
      expect(result.id).toBe(15);
    });

    it('정상 생성 시 매핑된 상세 응답을 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockResolvedValue(baseRecord);

      const result = await service.create('1', {
        ...validCreateFields,
        regDate: '2026-07-02',
        tagNames: ['야식'],
        foodIds: [1],
      });

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );

      expect(result.id).toBe(15);
      expect(result.regDate).toBe('2026-07-02');
      expect(result.tagNames).toEqual(['야식']);
      expect(result.foods).toEqual([{ id: 1, name: '자극적인 음식' }]);
    });

    it('regDate를 KST 자정에 해당하는 UTC 시각으로 저장한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockResolvedValue(baseRecord);

      await service.create('1', {
        ...validCreateFields,
        regDate: '2026-07-02',
      });

      const createMock = prisma.lifeRecord.create as jest.Mock<
        unknown,
        [{ data: { regDate: Date } }]
      >;
      expect(createMock.mock.calls[0][0].data.regDate).toEqual(
        new Date('2026-07-01T15:00:00.000Z'),
      );
    });

    it('DB 저장 중 오류가 발생하면 LIFE_RECORD_CREATE_FAILED를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockRejectedValue(new Error('db error'));

      await expect(
        service.create('1', { ...validCreateFields, regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_CREATE_FAILED,
      });
    });

    it('존재하지 않는 foodId가 포함되면 INVALID_FOOD_ID를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);

      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
          foodIds: [1, 999],
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_FOOD_ID,
      });
      expect(prisma.lifeRecord.create).not.toHaveBeenCalled();
      expect(reportSnapshots.invalidateByDateKey).not.toHaveBeenCalled();
    });

    it('존재하지 않는 medicineId가 포함되면 INVALID_MEDICINE_ID를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.medicine.findMany.mockResolvedValue([]);

      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
          medicineIds: [999],
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_MEDICINE_ID,
      });
      expect(prisma.lifeRecord.create).not.toHaveBeenCalled();
      expect(reportSnapshots.invalidateByDateKey).not.toHaveBeenCalled();
    });

    it('동시 생성으로 인한 userId+regDate 유니크 충돌(P2002)은 LIFE_RECORD_ALREADY_EXISTS를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
          meta: { target: 'life_record_index_2' },
        }),
      );

      await expect(
        service.create('1', { ...validCreateFields, regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
      });
    });

    it('Tag.name 유니크 충돌(P2002)은 날짜 중복이 아니므로 LIFE_RECORD_CREATE_FAILED를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
          meta: { target: 'tag_name_key' },
        }),
      );

      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
          tagNames: ['야식'],
        }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_CREATE_FAILED,
      });
    });

    it('target이 [userId, regDate] 배열(복합 충돌)이면 LIFE_RECORD_ALREADY_EXISTS를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
          meta: { target: ['userId', 'regDate'] },
        }),
      );

      await expect(
        service.create('1', { ...validCreateFields, regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
      });
    });

    it('target 배열에 userId 또는 regDate 중 하나만 있으면 날짜 중복이 아니므로 LIFE_RECORD_CREATE_FAILED를 던진다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.lifeRecord.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.8.0',
          meta: { target: ['userId'] },
        }),
      );

      await expect(
        service.create('1', { ...validCreateFields, regDate: '2026-07-02' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_CREATE_FAILED,
      });
    });

    it('스냅샷 무효화 실패 시 생활 기록을 생성하거나 복구하지 않는다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      reportSnapshots.invalidateByDateKey.mockRejectedValueOnce(
        new Error('snapshot invalidation failed'),
      );

      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
        }),
      ).rejects.toThrow('snapshot invalidation failed');

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );
      expect(prisma.lifeRecord.create).not.toHaveBeenCalled();
      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
    });

    it('복구 전 스냅샷 무효화가 실패하면 삭제 기록을 활성화하지 않는다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        status: 'D',
      });
      prisma.food.findMany.mockResolvedValue([{ id: 1 }]);
      reportSnapshots.invalidateByDateKey.mockRejectedValueOnce(
        new Error('snapshot invalidation failed'),
      );

      await expect(
        service.create('1', {
          ...validCreateFields,
          regDate: '2026-07-02',
        }),
      ).rejects.toThrow('snapshot invalidation failed');

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
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

  describe('findAll', () => {
    it('startDate 형식이 올바르지 않으면 INVALID_DATE_FORMAT을 던진다', async () => {
      await expect(
        service.findAll('1', { startDate: '2026/07/01' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_DATE_FORMAT,
      });
    });

    it('endDate 형식이 올바르지 않으면 INVALID_DATE_FORMAT을 던진다', async () => {
      await expect(
        service.findAll('1', { endDate: '2026/07/31' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_DATE_FORMAT,
      });
    });

    it('정상 조회 시 페이지네이션 정보와 함께 목록을 반환한다', async () => {
      prisma.lifeRecord.findMany.mockResolvedValue([baseRecord]);
      prisma.lifeRecord.count.mockResolvedValue(23);

      const result = await service.findAll('1', { page: 1, size: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(15);
      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
      expect(result.totalCount).toBe(23);
      expect(result.hasNext).toBe(true);
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

  describe('getTodayTags', () => {
    it('date 형식이 올바르지 않으면 INVALID_DATE_FORMAT을 던진다', async () => {
      await expect(
        service.getTodayTags('1', '2026/07/02'),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_DATE_FORMAT,
      });
    });

    it('해당 날짜에 기록이 없으면 빈 배열을 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);

      const result = await service.getTodayTags('1', '2026-07-02');

      expect(result).toEqual({ tagNames: [] });
    });

    it('기록이 삭제 상태(D)면 빈 배열을 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue({
        ...baseRecord,
        status: 'D',
      });

      const result = await service.getTodayTags('1', '2026-07-02');

      expect(result).toEqual({ tagNames: [] });
    });

    it('정상 조회 시 저장된 태그 이름만 반환한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(baseRecord);

      const result = await service.getTodayTags('1', '2026-07-02');

      expect(result).toEqual({ tagNames: ['야식'] });
    });

    it('date를 생략하면 오늘(KST) 날짜로 조회한다', async () => {
      prisma.lifeRecord.findUnique.mockResolvedValue(null);

      await service.getTodayTags('1');

      const [[callArgs]] = prisma.lifeRecord.findUnique.mock.calls as [
        [{ where: { userId_regDate: { userId: bigint; regDate: Date } } }],
      ];
      expect(callArgs.where.userId_regDate.userId).toBe(1n);
    });
  });

  describe('update', () => {
    it('생활 값이 올바르지 않으면 INVALID_LIFE_VALUE를 던진다', async () => {
      await expect(
        service.update('1', 15, { sleep: 'A' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_LIFE_VALUE,
      });
    });

    it('기록이 없으면 LIFE_RECORD_NOT_FOUND를 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.update('1', 15, { memo: '수정' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_NOT_FOUND,
      });
    });

    it('소유자가 다르면 LIFE_RECORD_FORBIDDEN을 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue({
        ...baseRecord,
        userId: 999n,
      });

      await expect(
        service.update('1', 15, { memo: '수정' }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN,
      });
    });

    it('정상 수정 시 태그/음식/약을 트랜잭션으로 재연결하고 수정된 응답을 반환한다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.food.findMany.mockResolvedValue([{ id: 3 }]);
      prisma.medicine.findMany.mockResolvedValue([{ id: 5 }]);
      prisma.lifeRecord.update.mockResolvedValue({
        ...baseRecord,
        memo: '수정된 메모',
        updateTime: new Date('2026-07-02T13:20:00.000Z'),
        foodTags: [{ food: { id: 3, name: '카페인' } }],
        medicineMaps: [{ medicine: { id: 5, name: '변비약' } }],
      });

      const result = await service.update('1', 15, {
        memo: '수정된 메모',
        tagNames: ['야식'],
        foodIds: [3],
        medicineIds: [5],
      });

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );

      expect(prisma.lifeTag.deleteMany).toHaveBeenCalledWith({
        where: { lifeId: 15n },
      });
      expect(prisma.lifeFoodTag.deleteMany).toHaveBeenCalledWith({
        where: { lifeId: 15n },
      });
      expect(prisma.medicineMap.deleteMany).toHaveBeenCalledWith({
        where: { lifeRecordId: 15n },
      });
      expect(result.memo).toBe('수정된 메모');
      expect(result.foods).toEqual([{ id: 3, name: '카페인' }]);
      expect(result.medicines).toEqual([{ id: 5, name: '변비약' }]);
    });

    it('존재하지 않는 foodId로 수정하면 기존 연결을 지우지 않고 INVALID_FOOD_ID를 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.food.findMany.mockResolvedValue([]);

      await expect(
        service.update('1', 15, { foodIds: [999] }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_FOOD_ID,
      });
      expect(prisma.lifeFoodTag.deleteMany).not.toHaveBeenCalled();
      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
      expect(reportSnapshots.invalidateByDateKey).not.toHaveBeenCalled();
    });

    it('존재하지 않는 medicineId로 수정하면 기존 연결을 지우지 않고 INVALID_MEDICINE_ID를 던진다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.medicine.findMany.mockResolvedValue([]);

      await expect(
        service.update('1', 15, { medicineIds: [999] }),
      ).rejects.toMatchObject({
        errorCode: LifeRecordErrorCode.INVALID_MEDICINE_ID,
      });
      expect(prisma.medicineMap.deleteMany).not.toHaveBeenCalled();
      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
      expect(reportSnapshots.invalidateByDateKey).not.toHaveBeenCalled();
    });

    it('스냅샷 무효화 실패 시 생활 기록 수정 트랜잭션을 시작하지 않는다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      reportSnapshots.invalidateByDateKey.mockRejectedValueOnce(
        new Error('snapshot invalidation failed'),
      );

      await expect(
        service.update('1', 15, { memo: '수정된 메모' }),
      ).rejects.toThrow('snapshot invalidation failed');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
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

      expect(reportSnapshots.invalidateByDateKey).toHaveBeenCalledWith(
        1n,
        '2026-07-02',
      );

      expect(result).toBeNull();
      const [[callArgs]] = prisma.lifeRecord.update.mock.calls as [
        [{ where: { id: bigint }; data: { status: string; updateTime: Date } }],
      ];
      expect(callArgs.where).toEqual({ id: 15n });
      expect(callArgs.data.status).toBe('D');
      expect(callArgs.data.updateTime).toBeInstanceOf(Date);
    });

    it('스냅샷 무효화 실패 시 생활 기록을 삭제하지 않는다', async () => {
      prisma.lifeRecord.findFirst.mockResolvedValue(baseRecord);
      reportSnapshots.invalidateByDateKey.mockRejectedValueOnce(
        new Error('snapshot invalidation failed'),
      );

      await expect(service.remove('1', 15)).rejects.toThrow(
        'snapshot invalidation failed',
      );

      expect(prisma.lifeRecord.update).not.toHaveBeenCalled();
    });
  });
});
