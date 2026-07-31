import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  // 프론트(PWA)가 FCM에서 발급받은 기기 등록 토큰.
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
