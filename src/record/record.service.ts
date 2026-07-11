import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRecordDto } from './dto/boogle-record.dto';
import { RecordResponseDto } from './dto/record-response.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RecordErrorCode } from './record-error-code.enum';

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}
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
}
