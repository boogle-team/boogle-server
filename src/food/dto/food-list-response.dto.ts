import { ApiProperty } from '@nestjs/swagger';

export class FoodDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '음주' })
  name: string;
}

export class FoodListResponseDto {
  @ApiProperty({
    type: [FoodDto],
    example: [
      { id: 1, name: '음주' },
      { id: 2, name: '야식' },
      { id: 3, name: '자극적인 음식' },
      { id: 4, name: '기름진 음식' },
      { id: 5, name: '유제품' },
      { id: 6, name: '채소·잡곡' },
    ],
  })
  items: FoodDto[];
}
