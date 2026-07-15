import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginRequestDto {
  @ApiProperty({
    enum: ['kakao', 'google'],
    example: 'kakao',
    description: '소셜 로그인 제공자',
  })
  @IsNotEmpty({ message: 'AUTH_INVALID_PROVIDER' })
  @IsIn(['kakao', 'google'], { message: 'AUTH_INVALID_PROVIDER' })
  @IsString({ message: 'AUTH_INVALID_PROVIDER' })
  provider!: 'kakao' | 'google';

  @ApiProperty({
    example: 'kakao-access-token',
    description:
      '프론트에서 받은 소셜 토큰. kakao는 accessToken, google은 idToken',
  })
  @IsNotEmpty({ message: 'AUTH_SOCIAL_TOKEN_REQUIRED' })
  @IsString({ message: 'AUTH_SOCIAL_TOKEN_REQUIRED' })
  socialToken!: string;
}
