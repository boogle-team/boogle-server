import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDataDto {
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
    example: 'CUSTOM',
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

  @ApiProperty({ example: true })
  sensitiveInfoAgreed!: boolean;
}

export class UserProfileResponseDto extends UserProfileDataDto {
  @ApiProperty({ example: true })
  onboardingCompleted!: boolean;
}

export class SaveOnboardingResponseDto {
  @ApiProperty({ example: true })
  onboardingCompleted!: boolean;

  @ApiProperty({ type: UserProfileDataDto })
  user!: UserProfileDataDto;
}

export class OnboardingStatusResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

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
    example: 'CUSTOM',
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

  @ApiProperty({ example: true })
  sensitiveInfoAgreed!: boolean;

  @ApiProperty({ example: true })
  onboardingCompleted!: boolean;
}

export class SocialAccountResponseDto {
  @ApiPropertyOptional({
    enum: ['GOOGLE', 'KAKAO'],
    nullable: true,
    example: 'GOOGLE',
  })
  provider!: 'GOOGLE' | 'KAKAO' | null;

  @ApiPropertyOptional({ nullable: true, example: 'boo***@example.com' })
  maskedEmail!: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-07-01T09:00:00.000Z' })
  linkedAt!: string;
}

export class MeResponseDto extends UserProfileResponseDto {
  @ApiProperty({ type: [SocialAccountResponseDto] })
  socialAccounts!: SocialAccountResponseDto[];

  @ApiProperty({ format: 'date-time', example: '2026-07-01T09:00:00.000Z' })
  regDate!: Date;
}

export class ProfileImageResponseDto {
  @ApiProperty({
    example: 'https://cdn.example.com/profile-images/users/1/id.jpg',
  })
  profileImage!: string;

  @ApiProperty({ enum: ['CUSTOM'], example: 'CUSTOM' })
  profileImageSource!: 'CUSTOM';
}
