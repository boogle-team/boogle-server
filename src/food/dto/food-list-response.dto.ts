import { ApiProperty } from '@nestjs/swagger';

export class FoodDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '자극적인 음식' })
  name: string;
}

export class FoodListResponseDto {
  @ApiProperty({ type: [FoodDto] })
  items: FoodDto[];
}
