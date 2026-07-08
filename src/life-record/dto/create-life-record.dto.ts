import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateLifeRecordDto {
  @ApiPropertyOptional({ example: '2026-07-02', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  regDate?: string;

  @ApiPropertyOptional({
    example: 'B',
    description: '좋음 G / 보통 N / 부족 B',
  })
  @IsOptional()
  @IsString()
  sleep?: string;

  @ApiPropertyOptional({
    example: 'H',
    description: '낮음 L / 보통 N / 높음 H',
  })
  @IsOptional()
  @IsString()
  stress?: string;

  @ApiPropertyOptional({
    example: 'N',
    description: '부족 L / 보통 N / 충분 H',
  })
  @IsOptional()
  @IsString()
  water?: string;

  @ApiPropertyOptional({
    example: 'I',
    description: '규칙 R / 보통 N / 불규칙 I',
  })
  @IsOptional()
  @IsString()
  mealRegular?: string;

  @ApiPropertyOptional({
    example: '어제 야식으로 매운 음식을 먹고 커피를 마셨다.',
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['야식', '매운 음식', '카페인'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  sleepTime?: number;

  @ApiPropertyOptional({
    example: 'N',
    description: '안 함 N / 가볍게 L / 충분히 H',
  })
  @IsOptional()
  @IsString()
  exercise?: string;

  @ApiPropertyOptional({
    example: 'O',
    description: '없음 N / 1잔 O / 2잔 이상 M',
  })
  @IsOptional()
  @IsString()
  caffeine?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description:
      '감기약 C / 항생제 V / 유산균 L / 철분제 I / 변비약 B / 기타 E',
  })
  @IsOptional()
  @IsString()
  medicine?: string | null;

  @ApiPropertyOptional({
    example: 'N',
    description: '평소와 같음 N / 외출 많음 L / 여행 중 T',
  })
  @IsOptional()
  @IsString()
  outing?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description: '없음 N / 생리 중 M / 변화 있음 E',
  })
  @IsOptional()
  @IsString()
  hormone?: string | null;

  @ApiPropertyOptional({ type: [Number], example: [1, 3] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  foodIds?: number[];
}
