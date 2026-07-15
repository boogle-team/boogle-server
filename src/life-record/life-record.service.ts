import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import {
  Food,
  LifeFoodTag,
  LifeRecord,
  LifeTag,
  Medicine,
  MedicineMap,
  Prisma,
  Tag,
} from '@/generated/prisma/client';
import { LifeRecordErrorCode } from './life-record-error-code.enum';
import { CreateLifeRecordDto } from './dto/create-life-record.dto';
import { UpdateLifeRecordDto } from './dto/update-life-record.dto';
import { ExtractTagsResponseDto } from './dto/extract-tags.dto';
import { LifeRecordListQueryDto } from './dto/life-record-list-query.dto';
import {
  LifeRecordDetailResponseDto,
  LifeRecordListResponseDto,
  LifeRecordUpdateResponseDto,
} from './dto/life-record-response.dto';
import { GeminiTagExtractorService } from './gemini-tag-extractor.service';
import {
  formatDateOnly,
  formatDateTime,
  isValidLifeValue,
  isValidRegDate,
  LIFE_VALUE_CODES,
  toBigInt,
  toNumberId,
} from './life-record.util';

type LifeRecordWithRelations = LifeRecord & {
  lifeTags: (LifeTag & { tag: Tag })[];
  foodTags: (LifeFoodTag & { food: Food })[];
  medicineMaps: (MedicineMap & { medicine: Medicine })[];
};

const LIFE_RECORD_INCLUDE = {
  lifeTags: { include: { tag: true } },
  foodTags: { include: { food: true } },
  medicineMaps: { include: { medicine: true } },
} as const;

const LIFE_VALUE_FIELDS = Object.keys(
  LIFE_VALUE_CODES,
) as (keyof typeof LIFE_VALUE_CODES)[];

const MAX_EXISTING_TAGS_FOR_PROMPT = 200;

@Injectable()
export class LifeRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiTagExtractor: GeminiTagExtractorService,
  ) {}

  async create(
    userId: string,
    dto: CreateLifeRecordDto,
  ): Promise<LifeRecordDetailResponseDto> {
    this.assertValidRegDate(dto.regDate);
    this.assertValidLifeValues(dto);

    const regDate = dto.regDate as string;
    const userIdBigInt = toBigInt(userId);

    const existing = await this.prisma.lifeRecord.findUnique({
      where: {
        userId_regDate: { userId: userIdBigInt, regDate: this.toDate(regDate) },
      },
    });
    if (existing) {
      throw new BusinessException(
        LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
        '해당 날짜의 생활 기록이 이미 존재합니다.',
        HttpStatus.CONFLICT,
      );
    }

    const tagNames = [...new Set(dto.tagNames ?? [])];
    const foodIds = await this.resolveValidFoodIds(dto.foodIds);
    const medicineIds = await this.resolveValidMedicineIds(dto.medicineIds);

    try {
      const created = await this.prisma.lifeRecord.create({
        data: {
          userId: userIdBigInt,
          regDate: this.toDate(regDate),
          sleep: dto.sleep,
          stress: dto.stress,
          water: dto.water,
          mealRegular: dto.mealRegular,
          memo: dto.memo,
          autoTags: tagNames.length ? tagNames.join(',') : null,
          sleepTime: dto.sleepTime,
          exercise: dto.exercise,
          caffeine: dto.caffeine,
          outing: dto.outing,
          hormone: dto.hormone,
          lifeTags: tagNames.length
            ? {
                create: tagNames.map((name) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              }
            : undefined,
          foodTags: foodIds.length
            ? {
                create: foodIds.map((foodId) => ({
                  food: { connect: { id: foodId } },
                })),
              }
            : undefined,
          medicineMaps: medicineIds.length
            ? {
                create: medicineIds.map((medicineId) => ({
                  medicine: { connect: { id: medicineId } },
                })),
              }
            : undefined,
        },
        include: LIFE_RECORD_INCLUDE,
      });

      return this.toDetailResponse(created);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        this.isRegDateUniqueConflict(error.meta?.target)
      ) {
        throw new BusinessException(
          LifeRecordErrorCode.LIFE_RECORD_ALREADY_EXISTS,
          '해당 날짜의 생활 기록이 이미 존재합니다.',
          HttpStatus.CONFLICT,
        );
      }
      throw new BusinessException(
        LifeRecordErrorCode.LIFE_RECORD_CREATE_FAILED,
        '생활 기록 저장 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async extractTags(text?: string): Promise<ExtractTagsResponseDto> {
    if (!text || text.trim().length === 0) {
      throw new BusinessException(
        LifeRecordErrorCode.TEXT_REQUIRED,
        '태그를 추출할 문장이 필요합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (text.length > 255) {
      throw new BusinessException(
        LifeRecordErrorCode.TEXT_TOO_LONG,
        '입력 문장은 255자 이하로 입력해야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingTags = await this.prisma.tag.findMany({
      select: { name: true },
      take: MAX_EXISTING_TAGS_FOR_PROMPT,
    });
    const tags = await this.geminiTagExtractor.extractTags(
      text,
      existingTags.map((tag) => tag.name),
    );
    const tagNames = tags.map((tag) => tag.name);

    return {
      originalText: text,
      tags,
      tagNames,
      autoTags: tagNames.join(','),
    };
  }

  async findAll(
    userId: string,
    query: LifeRecordListQueryDto,
  ): Promise<LifeRecordListResponseDto> {
    if (query.startDate && !isValidRegDate(query.startDate)) {
      this.throwInvalidDateFormat();
    }
    if (query.endDate && !isValidRegDate(query.endDate)) {
      this.throwInvalidDateFormat();
    }

    const page = query.page ?? 1;
    const size = query.size ?? 10;

    const where = {
      userId: toBigInt(userId),
      status: { not: 'D' },
      ...(query.startDate || query.endDate
        ? {
            regDate: {
              ...(query.startDate ? { gte: this.toDate(query.startDate) } : {}),
              ...(query.endDate ? { lte: this.toDate(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.lifeRecord.findMany({
        where,
        include: LIFE_RECORD_INCLUDE,
        orderBy: { regDate: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.lifeRecord.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: toNumberId(item.id),
        regDate: formatDateOnly(item.regDate),
        sleep: item.sleep,
        stress: item.stress,
        water: item.water,
        mealRegular: item.mealRegular,
        memo: item.memo,
        tagNames: item.lifeTags.map((lifeTag) => lifeTag.tag.name),
        foods: item.foodTags.map((foodTag) => ({
          id: foodTag.food.id,
          name: foodTag.food.name,
        })),
        status: item.status,
      })),
      page,
      size,
      totalCount,
      hasNext: page * size < totalCount,
    };
  }

  async findOne(
    userId: string,
    lifeId: number,
  ): Promise<LifeRecordDetailResponseDto> {
    const record = await this.findActiveOrThrow(lifeId);
    this.assertOwner(record, userId, LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN);

    return this.toDetailResponse(record);
  }

  async update(
    userId: string,
    lifeId: number,
    dto: UpdateLifeRecordDto,
  ): Promise<LifeRecordUpdateResponseDto> {
    this.assertValidLifeValues(dto);

    const record = await this.findActiveOrThrow(lifeId);
    this.assertOwner(record, userId, LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN);

    const foodIds =
      dto.foodIds !== undefined
        ? await this.resolveValidFoodIds(dto.foodIds)
        : undefined;
    const medicineIds =
      dto.medicineIds !== undefined
        ? await this.resolveValidMedicineIds(dto.medicineIds)
        : undefined;
    const tagNames =
      dto.tagNames !== undefined ? [...new Set(dto.tagNames)] : undefined;

    const lifeIdBigInt = toBigInt(lifeId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (tagNames !== undefined) {
        await tx.lifeTag.deleteMany({ where: { lifeId: lifeIdBigInt } });
      }
      if (foodIds !== undefined) {
        await tx.lifeFoodTag.deleteMany({ where: { lifeId: lifeIdBigInt } });
      }
      if (medicineIds !== undefined) {
        await tx.medicineMap.deleteMany({
          where: { lifeRecordId: lifeIdBigInt },
        });
      }

      return tx.lifeRecord.update({
        where: { id: lifeIdBigInt },
        data: {
          sleep: dto.sleep,
          stress: dto.stress,
          water: dto.water,
          mealRegular: dto.mealRegular,
          memo: dto.memo,
          autoTags:
            tagNames !== undefined ? tagNames.join(',') || null : undefined,
          sleepTime: dto.sleepTime,
          exercise: dto.exercise,
          caffeine: dto.caffeine,
          outing: dto.outing,
          hormone: dto.hormone,
          updateTime: new Date(),
          lifeTags:
            tagNames !== undefined
              ? {
                  create: tagNames.map((name) => ({
                    tag: {
                      connectOrCreate: {
                        where: { name },
                        create: { name },
                      },
                    },
                  })),
                }
              : undefined,
          foodTags: foodIds?.length
            ? {
                create: foodIds.map((foodId) => ({
                  food: { connect: { id: foodId } },
                })),
              }
            : undefined,
          medicineMaps: medicineIds?.length
            ? {
                create: medicineIds.map((medicineId) => ({
                  medicine: { connect: { id: medicineId } },
                })),
              }
            : undefined,
        },
        include: LIFE_RECORD_INCLUDE,
      });
    });

    return this.toUpdateResponse(updated);
  }

  async remove(userId: string, lifeId: number): Promise<null> {
    const record = await this.findActiveOrThrow(lifeId);
    this.assertOwner(record, userId, LifeRecordErrorCode.LIFE_RECORD_FORBIDDEN);

    await this.prisma.lifeRecord.update({
      where: { id: toBigInt(lifeId) },
      data: { status: 'D', updateTime: new Date() },
    });

    return null;
  }

  private async findActiveOrThrow(
    lifeId: number,
  ): Promise<LifeRecordWithRelations> {
    const record = await this.prisma.lifeRecord.findFirst({
      where: { id: toBigInt(lifeId), status: { not: 'D' } },
      include: LIFE_RECORD_INCLUDE,
    });

    if (!record) {
      throw new BusinessException(
        LifeRecordErrorCode.LIFE_RECORD_NOT_FOUND,
        '생활 기록을 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }

  private assertOwner(
    record: LifeRecordWithRelations,
    userId: string,
    errorCode: LifeRecordErrorCode,
  ): void {
    if (record.userId !== toBigInt(userId)) {
      throw new BusinessException(
        errorCode,
        '해당 기록에 접근할 권한이 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertValidRegDate(regDate?: string): void {
    if (!isValidRegDate(regDate)) {
      this.throwInvalidDateFormat();
    }
  }

  private isRegDateUniqueConflict(target: unknown): boolean {
    if (typeof target === 'string') {
      return target.includes('life_record_index_2');
    }
    if (Array.isArray(target)) {
      return target.includes('userId') || target.includes('regDate');
    }
    return false;
  }

  private throwInvalidDateFormat(): never {
    throw new BusinessException(
      LifeRecordErrorCode.INVALID_DATE_FORMAT,
      '날짜 형식이 올바르지 않습니다.',
      HttpStatus.BAD_REQUEST,
    );
  }

  private assertValidLifeValues(
    dto: CreateLifeRecordDto | UpdateLifeRecordDto,
  ): void {
    const hasInvalidChar = LIFE_VALUE_FIELDS.some(
      (field) => !isValidLifeValue(field, dto[field]),
    );
    const hasInvalidSleepTime =
      dto.sleepTime != null &&
      (!Number.isInteger(dto.sleepTime) || dto.sleepTime < 0);

    if (hasInvalidChar || hasInvalidSleepTime) {
      throw new BusinessException(
        LifeRecordErrorCode.INVALID_LIFE_VALUE,
        '생활 기록 항목 값이 올바르지 않습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async resolveValidFoodIds(foodIds?: number[]): Promise<number[]> {
    if (!foodIds || foodIds.length === 0) {
      return [];
    }

    const uniqueFoodIds = [...new Set(foodIds)];
    const foods = await this.prisma.food.findMany({
      where: { id: { in: uniqueFoodIds } },
      select: { id: true },
    });

    if (foods.length !== uniqueFoodIds.length) {
      throw new BusinessException(
        LifeRecordErrorCode.INVALID_FOOD_ID,
        '존재하지 않는 foodId가 포함되어 있습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return foods.map((food) => food.id);
  }

  private async resolveValidMedicineIds(
    medicineIds?: number[],
  ): Promise<number[]> {
    if (!medicineIds || medicineIds.length === 0) {
      return [];
    }

    const uniqueMedicineIds = [...new Set(medicineIds)];
    const medicines = await this.prisma.medicine.findMany({
      where: { id: { in: uniqueMedicineIds } },
      select: { id: true },
    });

    if (medicines.length !== uniqueMedicineIds.length) {
      throw new BusinessException(
        LifeRecordErrorCode.INVALID_MEDICINE_ID,
        '존재하지 않는 medicineId가 포함되어 있습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return medicines.map((medicine) => medicine.id);
  }

  private toDate(dateOnly: string): Date {
    return new Date(`${dateOnly}T00:00:00.000Z`);
  }

  private toDetailResponse(
    record: LifeRecordWithRelations,
  ): LifeRecordDetailResponseDto {
    return {
      id: toNumberId(record.id),
      userId: toNumberId(record.userId),
      regDate: formatDateOnly(record.regDate),
      sleep: record.sleep,
      stress: record.stress,
      water: record.water,
      mealRegular: record.mealRegular,
      memo: record.memo,
      autoTags: record.autoTags,
      tagNames: record.lifeTags.map((lifeTag) => lifeTag.tag.name),
      sleepTime: record.sleepTime,
      exercise: record.exercise,
      caffeine: record.caffeine,
      medicines: record.medicineMaps.map((medicineMap) => ({
        id: medicineMap.medicine.id,
        name: medicineMap.medicine.name ?? '',
      })),
      outing: record.outing,
      hormone: record.hormone,
      foods: record.foodTags.map((foodTag) => ({
        id: foodTag.food.id,
        name: foodTag.food.name,
      })),
      status: record.status,
      createdAt: formatDateTime(record.regDate),
      updatedAt: record.updateTime ? formatDateTime(record.updateTime) : null,
    };
  }

  private toUpdateResponse(
    record: LifeRecordWithRelations,
  ): LifeRecordUpdateResponseDto {
    return {
      id: toNumberId(record.id),
      regDate: formatDateOnly(record.regDate),
      sleep: record.sleep,
      stress: record.stress,
      water: record.water,
      mealRegular: record.mealRegular,
      memo: record.memo,
      tagNames: record.lifeTags.map((lifeTag) => lifeTag.tag.name),
      sleepTime: record.sleepTime,
      exercise: record.exercise,
      caffeine: record.caffeine,
      medicines: record.medicineMaps.map((medicineMap) => ({
        id: medicineMap.medicine.id,
        name: medicineMap.medicine.name ?? '',
      })),
      outing: record.outing,
      hormone: record.hormone,
      foods: record.foodTags.map((foodTag) => ({
        id: foodTag.food.id,
        name: foodTag.food.name,
      })),
      status: record.status,
      updatedAt: formatDateTime(record.updateTime as Date),
    };
  }
}
