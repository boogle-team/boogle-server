import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthResultExchangeRequestDto {
  @ApiProperty({
    example: 'oauth-result-code-value',
    description: 'OAuth 콜백에서 전달받은 일회용 결과 코드',
  })
  @IsString({ message: 'AUTH_OAUTH_RESULT_CODE_REQUIRED' })
  @IsNotEmpty({ message: 'AUTH_OAUTH_RESULT_CODE_REQUIRED' })
  oauthResultCode!: string;
}
