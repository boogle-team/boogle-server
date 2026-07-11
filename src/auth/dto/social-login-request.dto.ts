import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginRequestDto {
  @ApiProperty({
    enum: ['kakao', 'google'],
    example: 'kakao',
    description: '소셜 로그인 제공자',
  })
  @IsNotEmpty()
  @IsIn(['kakao', 'google'])
  @IsString()
  provider!: 'kakao' | 'google';

  @ApiProperty({
    example: 'kakao-access-token',
    description:
      '프론트에서 받은 소셜 토큰. kakao는 accessToken, google은 idToken',
  })
  @IsNotEmpty()
  @IsString()
  socialToken!: string;
}
