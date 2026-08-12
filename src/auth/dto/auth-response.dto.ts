import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthTokenPairResponseDto {
  @ApiProperty({
    description: 'API 인증에 사용하는 JWT',
    example: 'eyJhbGciOi...',
  })
  accessToken!: string;

  @ApiProperty({
    description: '토큰 재발급에 사용하는 JWT',
    example: 'eyJhbGciOi...',
  })
  refreshToken!: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'access token 유효시간(초)', example: 3600 })
  expiresIn!: number;

  @ApiProperty({ description: 'refresh token 유효시간(초)', example: 1209600 })
  refreshTokenExpiresIn!: number;
}

export class AuthUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ nullable: true, example: 'boogle@example.com' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '부글이' })
  nickname!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example.com/profile.jpg',
  })
  profileImage!: string | null;

  @ApiPropertyOptional({
    enum: ['CUSTOM', 'SOCIAL'],
    nullable: true,
    example: 'SOCIAL',
  })
  profileImageSource!: 'CUSTOM' | 'SOCIAL' | null;

  @ApiPropertyOptional({ enum: ['M', 'F', 'N'], nullable: true, example: 'F' })
  gender!: string | null;

  @ApiPropertyOptional({ enum: [10, 20, 30, 40], nullable: true, example: 20 })
  ageGroup!: number | null;

  @ApiPropertyOptional({
    enum: ['R', 'C', 'L', 'U'],
    nullable: true,
    example: 'R',
  })
  baselineType!: string | null;

  @ApiProperty({ example: false })
  sensitiveInfoAgreed!: boolean;
}

export class OAuthLoginResponseDto extends AuthTokenPairResponseDto {
  @ApiProperty({ example: false })
  isNewUser!: boolean;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ enum: ['HOME', 'ONBOARDING_REQUIRED'], example: 'HOME' })
  nextAction!: 'HOME' | 'ONBOARDING_REQUIRED';

  @ApiProperty({ example: true })
  onboardingCompleted!: boolean;
}

export class AccountLinkRequiredResponseDto {
  @ApiProperty({ enum: ['ACCOUNT_LINK_REQUIRED'] })
  nextAction!: 'ACCOUNT_LINK_REQUIRED';

  @ApiProperty({ description: '동일 이메일 계정 연동에 사용하는 일회용 토큰' })
  accountLinkToken!: string;

  @ApiProperty({ description: '계정 연동 토큰 유효시간(초)', example: 600 })
  accountLinkTokenExpiresIn!: number;

  @ApiProperty({ enum: ['google', 'kakao'], example: 'google' })
  provider!: 'google' | 'kakao';

  @ApiProperty({ example: 'boogle@example.com' })
  email!: string;
}
