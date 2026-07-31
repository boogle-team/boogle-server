import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SaveOnboardingRequestDto {
  @ApiProperty({
    example: '부글이',
    description: '사용자 닉네임, 최대 10자',
  })
  @IsString({ message: 'NICKNAME_REQUIRED' })
  @IsNotEmpty({ message: 'NICKNAME_REQUIRED' })
  @MaxLength(10, { message: 'NICKNAME_TOO_LONG' })
  nickname!: string;

  @ApiProperty({
    enum: ['M', 'F', 'N'],
    example: 'F',
    description: 'M: 남성, F: 여성, N: 선택 안 함',
  })
  @IsIn(['M', 'F', 'N'], { message: 'INVALID_GENDER' })
  gender!: 'M' | 'F' | 'N';

  @ApiProperty({
    enum: [10, 20, 30, 40],
    example: 20,
    description: '10, 20, 30, 40',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'INVALID_AGE_GROUP' })
  @IsIn([10, 20, 30, 40], { message: 'INVALID_AGE_GROUP' })
  ageGroup!: number;

  @ApiProperty({
    enum: ['R', 'C', 'L', 'U'],
    example: 'R',
    description:
      'R: 규칙적인 편, C: 변비 경향, L: 묽은 변 경향, U: 잘 모르겠음',
  })
  @IsIn(['R', 'C', 'L', 'U'], { message: 'INVALID_BASELINE_TYPE' })
  baselineType!: 'R' | 'C' | 'L' | 'U';

  @ApiPropertyOptional({
    example: true,
    description: 'gender가 F 또는 N일 때 필수인 민감정보 수집 동의 결과',
  })
  @ValidateIf((dto: SaveOnboardingRequestDto) =>
    ['F', 'N'].includes(dto.gender),
  )
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'SENSITIVE_INFO_AGREEMENT_INVALID' })
  sensitiveInfoAgreed?: boolean;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'gender가 F 또는 N일 때 노출한 동의문 버전',
  })
  @ValidateIf((dto: SaveOnboardingRequestDto) =>
    ['F', 'N'].includes(dto.gender),
  )
  @IsString({ message: 'POLICY_VERSION_REQUIRED' })
  @IsNotEmpty({ message: 'POLICY_VERSION_REQUIRED' })
  sensitiveInfoPolicyVersion?: string;
}
