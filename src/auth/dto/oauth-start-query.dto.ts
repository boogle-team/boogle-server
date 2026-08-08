import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OAuthStartQueryDto {
  @ApiPropertyOptional({
    description:
      '로그인 완료 후 돌아갈 프론트 Origin. FRONTEND_ORIGIN 허용 목록에 등록된 값만 사용할 수 있습니다.',
    example: 'http://localhost:5173',
  })
  @IsOptional()
  @IsString()
  frontendOrigin?: string;
}
