import { ApiProperty } from '@nestjs/swagger';

export class FoodDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '자극적인 음식' })
  name: string;
}

export class FoodListResponseDto {
  @ApiProperty({
    type: [FoodDto],
    example: [
      { id: 1, name: '자극적인 음식' },
      { id: 2, name: '기름진 음식' },
      { id: 3, name: '카페인' },
      { id: 4, name: '유제품' },
      { id: 5, name: '식이섬유 충분' },
    ],
  })
  items: FoodDto[];
}
