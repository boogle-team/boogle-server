import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SaveOnboardingRequestDto {
  @ApiProperty({
    example: '부글이',
    description: '사용자 닉네임, 최대 10자',
  })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.png',
    nullable: true,
    description: '프로필 이미지 URL. null이면 기본 이미지',
  })
  @IsOptional()
  @IsString()
  profileImage?: string | null;

  @ApiProperty({
    enum: ['M', 'F', 'N'],
    example: 'F',
    description: 'M: 남성, F: 여성, N: 선택 안 함',
  })
  @IsIn(['M', 'F', 'N'])
  gender: 'M' | 'F' | 'N';

  @ApiProperty({
    enum: [10, 20, 30, 40],
    example: 20,
    description: '10, 20, 30, 40',
  })
  @Type(() => Number)
  @IsNumber()
  @IsIn([10, 20, 30, 40])
  ageGroup: number;

  @ApiProperty({
    enum: ['R', 'C', 'L', 'U'],
    example: 'R',
    description:
      'R: 규칙적인 편, C: 변비 경향, L: 묽은 변 경향, U: 잘 모르겠음',
  })
  @IsIn(['R', 'C', 'L', 'U'])
  baselineType: 'R' | 'C' | 'L' | 'U';
}
