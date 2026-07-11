import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRecordDto } from './dto/boogle-record.dto';
import { RecordResponseDto } from './dto/record-response.dto';

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    userId: number,
    dto: CreateRecordDto,
  ): Promise<RecordResponseDto> {
    const record = await this.prisma.boogleRecord.create({
      data: {
        userId,
        ...dto,
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
}
