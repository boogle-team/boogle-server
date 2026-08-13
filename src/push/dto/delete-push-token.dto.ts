import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeletePushTokenDto {
  // 로그아웃/알림 해제 시 프론트가 해제할 자신의 기기 토큰.
  @ApiProperty({
    description: '해제할 FCM 기기 토큰',
    example: 'fGqJ...:APA91b...(FCM 등록 토큰)',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
