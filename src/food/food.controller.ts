import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { FoodService } from './food.service';
import { FoodListResponseDto } from './dto/food-list-response.dto';
import { FoodListQueryDto } from './dto/food-list-query.dto';

@ApiTags('음식 목록 (생활 기록 등록 시 참조)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  @ApiOperation({
    summary: '음식 목록 조회',
    description:
      'keyword를 보내면 음식명에 해당 문자열이 포함된 항목만 필터링합니다. keyword 없이 호출하면 전체 목록을 반환합니다. 생활기록 생성/수정 시 foodIds에 넣을 음식 ID를 조회할 때 사용합니다.',
  })
  @ResponseMessage('음식 목록 조회에 성공했습니다.')
  @ApiOkResponse({
    type: FoodListResponseDto,
    description: '음식 목록 조회 성공 (keyword로 음식명 부분 일치 검색 가능)',
  })
  @ApiUnauthorizedResponse({
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
  })
  @ApiInternalServerErrorResponse({
    description: '음식 목록 조회 중 오류 발생(FOOD_LIST_READ_FAILED)',
  })
  findAll(
    @CurrentUser() _user: AuthenticatedUser,
    @Query() query: FoodListQueryDto,
  ): Promise<FoodListResponseDto> {
    return this.foodService.findAll(query.keyword);
  }
}
