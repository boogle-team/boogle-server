import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiPropertyOptional({
    example: 'refresh-token-value',
    description:
      '무효화할 refreshToken. 없으면 현재 사용자의 활성 refreshToken을 모두 무효화합니다.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
