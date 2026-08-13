import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthErrorCode } from '../auth-error-code.enum';

export class AccountLinkRequestDto {
  @ApiProperty({
    example: 'account-link-token-value',
    description: '소셜 로그인 결과 교환에서 발급된 일회용 계정 연동 토큰',
  })
  @IsString({ message: AuthErrorCode.AUTH_ACCOUNT_LINK_TOKEN_REQUIRED })
  @IsNotEmpty({ message: AuthErrorCode.AUTH_ACCOUNT_LINK_TOKEN_REQUIRED })
  accountLinkToken!: string;
}
