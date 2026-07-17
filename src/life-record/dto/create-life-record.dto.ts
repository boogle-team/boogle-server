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
    example: 1,
    description: '물 섭취량 (잔 수, 1잔 ≈ 200ml)',
  })
  @IsOptional()
  @IsInt()
  waterIntake?: number;

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

  @ApiPropertyOptional({ example: 4, description: '수면 시간(시간 단위)' })
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
    type: [Number],
    example: [1, 3],
    description:
      '복용한 약 ID 목록 (medicine 테이블 참조: 1 감기약 / 2 항생제 / 3 유산균 / 4 철분제 / 5 변비약 / 6 기타)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  medicineIds?: number[];

  @ApiPropertyOptional({
    example: 'N',
    description: '평소와 같음 N / 외출 많음 L / 여행 중 T',
  })
  @IsOptional()
  @IsString()
  outing?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'N',
    description:
      '없음 N / 생리 중 M / 변화 있음 E (마이페이지에서 민감정보 동의한 사용자만 노출)',
  })
  @IsOptional()
  @IsString()
  hormone?: string | null;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 3],
    description:
      '오늘 먹은 음식 ID 목록 (food 목록 조회 API로 확인 가능, 1 자극적인 음식 / 3 카페인)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  foodIds?: number[];
}
