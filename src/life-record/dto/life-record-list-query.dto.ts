import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LifeRecordListQueryDto {
  @ApiPropertyOptional({
    example: '2026-07-01',
    description: '조회 시작 날짜 (YYYY-MM-DD, 미입력 시 전체 기간)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: '조회 종료 날짜 (YYYY-MM-DD, 미입력 시 전체 기간)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: '페이지 번호 (1부터 시작)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: '페이지당 항목 수 (최대 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 10;
}
