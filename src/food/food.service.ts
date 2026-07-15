import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BusinessException } from '@/common/exceptions/business.exception';
import { FoodErrorCode } from './food-error-code.enum';
import { FoodListResponseDto } from './dto/food-list-response.dto';

@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(keyword?: string): Promise<FoodListResponseDto> {
    try {
      const foods = await this.prisma.food.findMany({
        where: keyword ? { name: { contains: keyword } } : undefined,
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      });

      return {
        items: foods.map((food) => ({ id: food.id, name: food.name })),
      };
    } catch (error) {
      this.logger.error('음식 목록 조회 실패', error);
      throw new BusinessException(
        FoodErrorCode.FOOD_LIST_READ_FAILED,
        '음식 목록 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
