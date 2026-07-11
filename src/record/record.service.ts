import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRecordDto } from './dto/boogle-record.dto';
import { RecordResponseDto } from './dto/record-response.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RecordErrorCode } from './record-error-code.enum';
import { BoogleRecord } from '@/generated/prisma/client';

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}

  // 부글 기록 생성
  async create(
    userId: number,
    dto: CreateRecordDto,
  ): Promise<RecordResponseDto> {
    this.validateRecord(dto);

    const record = await this.prisma.boogleRecord.create({
      data: {
        userId,
        ...dto,
        stoolSimple: this.convertStoolSimple(dto.stoolBristol),
        regDate: new Date(dto.regDate),
      },
    });

    return this.toResponse(record);
  }

  // 변 상태 stoolSimple 변환 저장
  private convertStoolSimple(stoolBristol?: number): string | undefined {
    if (stoolBristol == null) {
      return undefined;
    }

    if (stoolBristol <= 2) {
      return 'H';
    }

    if (stoolBristol <= 4) {
      return 'M';
    }

    return 'T';
  }

  // 부글 기록 필수 입력 에러
  private validateRecord(dto: CreateRecordDto) {
    if (dto.hasBowel === true) {
      if (
        dto.stoolBristol == null ||
        dto.bowelFeeling == null ||
        dto.stomach == null
      ) {
        throw new BusinessException(
          RecordErrorCode.INVALID_BOWEL_REQUEST,
          '배변한 경우 필수 정보를 입력해야합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  // 부글 기록 조회
  async findOne(userId: number, id: number): Promise<RecordResponseDto> {
    const record = await this.findRecord(id);

    this.validateOwner(record, userId);

    return this.toResponse(record);
  }

  // 기록존재 여부 확인
  private async findRecord(id: number) {
    const record = await this.prisma.boogleRecord.findUnique({
      where: {
        id,
      },
    });

    if (!record) {
      throw new BusinessException(
        RecordErrorCode.RECORD_NOT_FOUND,
        '존재하지 않는 기록입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return record;
  }

  // 기록 소유자 확인
  private validateOwner(record: BoogleRecord, userId: number): void {
    if (record.userId !== BigInt(userId)) {
      throw new BusinessException(
        RecordErrorCode.RECORD_FORBIDDEN,
        '해당 기록에 접근할 권한이 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // 응답 DTO 변환
  private toResponse(record: BoogleRecord): RecordResponseDto {
    return {
      id: Number(record.id),
      userId: Number(record.userId),
      regDate: record.regDate.toISOString().slice(0, 10),
      hasBowel: record.hasBowel,
      stoolBristol: record.stoolBristol,
      stoolSimple: record.stoolSimple,
      bowlFeeling: record.bowelFeeling,
      stomach: record.stomach,
      distension: record.distension,
      remainingFeeling: record.remainingFeeling,
      urgency: record.urgency,
      takenTime: record.takenTime,
      amount: record.amount,
      color: record.color,
      status: record.status,
      updatedAt: record.updateDate?.toISOString() ?? '',
    };
  }
}
