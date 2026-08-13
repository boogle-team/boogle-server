import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  // 프론트(PWA)가 FCM에서 발급받은 기기 등록 토큰.
  @ApiProperty({
    description: 'FCM에서 발급받은 기기 토큰',
    example: 'fGqJ...:APA91b...(FCM 등록 토큰)',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
