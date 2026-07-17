import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodDto } from '@/food/dto/food-list-response.dto';

export class MedicineDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '감기약' })
  name: string;
}

export class LifeRecordDetailResponseDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: '2026-07-02' })
  regDate: string;

  @ApiPropertyOptional({ nullable: true, example: 'B' })
  sleep: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'H' })
  stress: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  water: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 1,
    description: '물 섭취량 (잔 수, 1잔 ≈ 200ml)',
  })
  waterIntake: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'I' })
  mealRegular: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '어제 야식으로 매운 음식을 먹고 커피를 마셨다.',
  })
  memo: string | null;

  @ApiPropertyOptional({ nullable: true, example: '야식,매운 음식,카페인' })
  autoTags: string | null;

  @ApiProperty({ type: [String], example: ['야식', '매운 음식', '카페인'] })
  tagNames: string[];

  @ApiPropertyOptional({ nullable: true, example: 4 })
  sleepTime: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  exercise: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'O' })
  caffeine: string | null;

  @ApiProperty({
    type: [MedicineDto],
    example: [
      { id: 1, name: '감기약' },
      { id: 3, name: '유산균' },
    ],
  })
  medicines: MedicineDto[];

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  outing: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  hormone: string | null;

  @ApiProperty({
    type: [FoodDto],
    example: [
      { id: 1, name: '자극적인 음식' },
      { id: 3, name: '카페인' },
    ],
  })
  foods: FoodDto[];

  @ApiProperty({ example: 'A' })
  status: string;

  @ApiProperty({ example: '2026-07-02T10:30:00' })
  createdAt: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  updatedAt: string | null;
}

export class LifeRecordUpdateResponseDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: '2026-07-02' })
  regDate: string;

  @ApiPropertyOptional({ nullable: true })
  sleep: string | null;

  @ApiPropertyOptional({ nullable: true })
  stress: string | null;

  @ApiPropertyOptional({ nullable: true })
  water: string | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  waterIntake: number | null;

  @ApiPropertyOptional({ nullable: true })
  mealRegular: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '어제 야식으로 매운 음식을 먹고 커피를 마셨다.',
  })
  memo: string | null;

  @ApiProperty({ type: [String], example: ['야식', '매운 음식', '카페인'] })
  tagNames: string[];

  @ApiPropertyOptional({ nullable: true, example: 4 })
  sleepTime: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  exercise: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'O' })
  caffeine: string | null;

  @ApiProperty({
    type: [MedicineDto],
    example: [
      { id: 1, name: '감기약' },
      { id: 3, name: '유산균' },
    ],
  })
  medicines: MedicineDto[];

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  outing: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  hormone: string | null;

  @ApiProperty({
    type: [FoodDto],
    example: [
      { id: 1, name: '자극적인 음식' },
      { id: 3, name: '카페인' },
    ],
  })
  foods: FoodDto[];

  @ApiProperty({ example: 'A' })
  status: string;

  @ApiProperty({ example: '2026-07-02T13:20:00' })
  updatedAt: string;
}

export class LifeRecordListItemDto {
  @ApiProperty({ example: 15 })
  id: number;

  @ApiProperty({ example: '2026-07-02' })
  regDate: string;

  @ApiPropertyOptional({ nullable: true, example: 'B' })
  sleep: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'H' })
  stress: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  water: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'I' })
  mealRegular: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '어제 야식으로 매운 음식을 먹고 커피를 마셨다.',
  })
  memo: string | null;

  @ApiProperty({ type: [String], example: ['야식', '매운 음식', '카페인'] })
  tagNames: string[];

  @ApiProperty({
    type: [FoodDto],
    example: [
      { id: 1, name: '자극적인 음식' },
      { id: 3, name: '카페인' },
    ],
  })
  foods: FoodDto[];

  @ApiProperty({ example: 'A' })
  status: string;
}

export class LifeRecordListResponseDto {
  @ApiProperty({ type: [LifeRecordListItemDto] })
  items: LifeRecordListItemDto[];

  @ApiProperty({ example: 1, description: '현재 페이지 번호' })
  page: number;

  @ApiProperty({ example: 10, description: '페이지당 항목 수' })
  size: number;

  @ApiProperty({ example: 23, description: '조건에 맞는 전체 기록 수' })
  totalCount: number;

  @ApiProperty({
    example: true,
    description: '다음 페이지 존재 여부 (page * size < totalCount)',
  })
  hasNext: boolean;
}
