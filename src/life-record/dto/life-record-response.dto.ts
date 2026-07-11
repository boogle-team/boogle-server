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

  @ApiPropertyOptional({ nullable: true, example: 'I' })
  mealRegular: string | null;

  @ApiPropertyOptional({ nullable: true })
  memo: string | null;

  @ApiPropertyOptional({ nullable: true, example: '야식,매운 음식,카페인' })
  autoTags: string | null;

  @ApiProperty({ type: [String] })
  tagNames: string[];

  @ApiPropertyOptional({ nullable: true, example: 2 })
  sleepTime: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  exercise: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'O' })
  caffeine: string | null;

  @ApiProperty({ type: [MedicineDto] })
  medicines: MedicineDto[];

  @ApiPropertyOptional({ nullable: true, example: 'N' })
  outing: string | null;

  @ApiPropertyOptional({ nullable: true })
  hormone: string | null;

  @ApiProperty({ type: [FoodDto] })
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

  @ApiPropertyOptional({ nullable: true })
  mealRegular: string | null;

  @ApiPropertyOptional({ nullable: true })
  memo: string | null;

  @ApiProperty({ type: [String] })
  tagNames: string[];

  @ApiPropertyOptional({ nullable: true })
  sleepTime: number | null;

  @ApiPropertyOptional({ nullable: true })
  exercise: string | null;

  @ApiPropertyOptional({ nullable: true })
  caffeine: string | null;

  @ApiProperty({ type: [MedicineDto] })
  medicines: MedicineDto[];

  @ApiPropertyOptional({ nullable: true })
  outing: string | null;

  @ApiPropertyOptional({ nullable: true })
  hormone: string | null;

  @ApiProperty({ type: [FoodDto] })
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

  @ApiPropertyOptional({ nullable: true })
  sleep: string | null;

  @ApiPropertyOptional({ nullable: true })
  stress: string | null;

  @ApiPropertyOptional({ nullable: true })
  water: string | null;

  @ApiPropertyOptional({ nullable: true })
  mealRegular: string | null;

  @ApiPropertyOptional({ nullable: true })
  memo: string | null;

  @ApiProperty({ type: [String] })
  tagNames: string[];

  @ApiProperty({ type: [FoodDto] })
  foods: FoodDto[];

  @ApiProperty({ example: 'A' })
  status: string;
}

export class LifeRecordListResponseDto {
  @ApiProperty({ type: [LifeRecordListItemDto] })
  items: LifeRecordListItemDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  size: number;

  @ApiProperty({ example: 1 })
  totalCount: number;

  @ApiProperty({ example: false })
  hasNext: boolean;
}
