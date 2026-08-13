import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({
    example: 'refresh-token-value',
    description: '무효화할 현재 로그인 세션의 refreshToken',
  })
  @IsString({ message: 'REFRESH_TOKEN_REQUIRED' })
  @IsNotEmpty({ message: 'REFRESH_TOKEN_REQUIRED' })
  refreshToken!: string;
}
