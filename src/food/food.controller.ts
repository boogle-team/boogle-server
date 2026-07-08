import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '@/common/decorators/current-user-id.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { FoodService } from './food.service';
import { FoodListResponseDto } from './dto/food-list-response.dto';
import { FoodListQueryDto } from './dto/food-list-query.dto';

@ApiTags('food')
@ApiBearerAuth()
@ApiHeader({ name: 'x-user-id', description: '임시 로그인 사용자 ID' })
@Controller('foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  @ApiOperation({ summary: '음식 목록 조회' })
  @ResponseMessage('음식 목록 조회에 성공했습니다.')
  findAll(
    @CurrentUserId() _userId: number,
    @Query() query: FoodListQueryDto,
  ): Promise<FoodListResponseDto> {
    return this.foodService.findAll(query.keyword);
  }
}
