import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OAuthCallbackQueryDto {
  @ApiPropertyOptional({ description: '소셜 제공자가 발급한 인증 코드' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '로그인 요청의 CSRF 방지 값' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: '소셜 제공자가 전달한 오류 코드' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: '소셜 제공자의 오류 설명' })
  @IsOptional()
  @IsString()
  error_description?: string;
}
