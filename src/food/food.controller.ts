import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { FoodService } from './food.service';
import { FoodListResponseDto } from './dto/food-list-response.dto';
import { FoodListQueryDto } from './dto/food-list-query.dto';

@ApiTags('food')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  @ApiOperation({ summary: '음식 목록 조회' })
  @ResponseMessage('음식 목록 조회에 성공했습니다.')
  findAll(
    @CurrentUser() _user: AuthenticatedUser,
    @Query() query: FoodListQueryDto,
  ): Promise<FoodListResponseDto> {
    return this.foodService.findAll(query.keyword);
  }
}
