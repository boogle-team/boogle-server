import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ enum: ['kakao', 'google'], example: 'kakao' })
  @IsIn(['kakao', 'google'], { message: 'AUTH_INVALID_PROVIDER' })
  provider!: 'kakao' | 'google';

  @ApiProperty({ example: 'kakao-access-token' })
  @IsString({ message: 'AUTH_SOCIAL_TOKEN_REQUIRED' })
  @IsNotEmpty({ message: 'AUTH_SOCIAL_TOKEN_REQUIRED' })
  socialToken!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'PRIVACY_POLICY_AGREEMENT_REQUIRED' })
  @Equals(true, { message: 'PRIVACY_POLICY_AGREEMENT_REQUIRED' })
  privacyPolicyAgreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @IsString()
  @IsNotEmpty()
  privacyPolicyVersion!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  sensitiveInfoAgreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @IsString()
  @IsNotEmpty()
  sensitiveInfoPolicyVersion!: string;
}
