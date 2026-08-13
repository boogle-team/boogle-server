import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({
    example: 'refresh-token-value',
    description: '재발급에 사용할 refreshToken',
  })
  @IsString({ message: 'REFRESH_TOKEN_REQUIRED' })
  @IsNotEmpty({ message: 'REFRESH_TOKEN_REQUIRED' })
  refreshToken: string;
}
