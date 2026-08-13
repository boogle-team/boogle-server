import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateMeRequestDto {
  @ApiPropertyOptional({
    example: '부글이',
    description: '사용자 닉네임, 최대 10자',
  })
  @IsOptional()
  @IsString({ message: 'NICKNAME_REQUIRED' })
  @IsNotEmpty({ message: 'NICKNAME_REQUIRED' })
  @MaxLength(10, { message: 'NICKNAME_TOO_LONG' })
  nickname?: string;

  @ApiPropertyOptional({
    enum: ['M', 'F', 'N'],
    example: 'F',
    description: 'M: 남성, F: 여성, N: 선택 안 함',
  })
  @IsOptional()
  @IsIn(['M', 'F', 'N'], { message: 'INVALID_GENDER' })
  gender?: 'M' | 'F' | 'N';

  @ApiPropertyOptional({
    enum: [10, 20, 30, 40],
    example: 20,
    description: '10, 20, 30, 40',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'INVALID_AGE_GROUP' })
  @IsIn([10, 20, 30, 40], { message: 'INVALID_AGE_GROUP' })
  ageGroup?: number;

  @ApiPropertyOptional({
    enum: ['R', 'C', 'L', 'U'],
    example: 'R',
    description:
      'R: 규칙적인 편, C: 변비 경향, L: 묽은 변 경향, U: 잘 모르겠음',
  })
  @IsOptional()
  @IsIn(['R', 'C', 'L', 'U'], { message: 'INVALID_BASELINE_TYPE' })
  baselineType?: 'R' | 'C' | 'L' | 'U';
}
