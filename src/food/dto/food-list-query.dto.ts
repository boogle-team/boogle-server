import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FoodListQueryDto {
  @ApiPropertyOptional({ example: '카페인', description: '음식명 검색어' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
