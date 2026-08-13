import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { MedicineErrorCode } from './medicine-error-code.enum';
import { MedicineListResponseDto } from './dto/medicine-list-response.dto';

@Injectable()
export class MedicineService {
  private readonly logger = new Logger(MedicineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(keyword?: string): Promise<MedicineListResponseDto> {
    try {
      const medicines = await this.prisma.medicine.findMany({
        where: keyword ? { name: { contains: keyword } } : undefined,
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });

      return {
        items: medicines.map((medicine) => ({
          id: medicine.id,
          name: medicine.name ?? '',
        })),
      };
    } catch (error) {
      this.logger.error('약/영양제 목록 조회 실패', error);
      throw new BusinessException(
        MedicineErrorCode.MEDICINE_LIST_READ_FAILED,
        '약/영양제 목록 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
