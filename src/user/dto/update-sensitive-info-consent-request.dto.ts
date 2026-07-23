import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateSensitiveInfoConsentRequestDto {
  @ApiProperty({ example: true })
  @IsBoolean({ message: 'SENSITIVE_INFO_AGREEMENT_INVALID' })
  agreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @IsString({ message: 'POLICY_VERSION_REQUIRED' })
  @IsNotEmpty({ message: 'POLICY_VERSION_REQUIRED' })
  policyVersion!: string;
}
