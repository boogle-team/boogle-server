import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({
    example: 'signup-ticket-value',
    description: 'AUTH-07에서 발급된 일회용 회원가입 티켓',
  })
  @IsString({ message: 'AUTH_SIGNUP_TICKET_REQUIRED' })
  @IsNotEmpty({ message: 'AUTH_SIGNUP_TICKET_REQUIRED' })
  signupTicket!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'PRIVACY_POLICY_AGREEMENT_REQUIRED' })
  @Equals(true, { message: 'PRIVACY_POLICY_AGREEMENT_REQUIRED' })
  privacyPolicyAgreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @IsString()
  @IsNotEmpty()
  privacyPolicyVersion!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  sensitiveInfoAgreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @IsString()
  @IsNotEmpty()
  sensitiveInfoPolicyVersion!: string;
}
