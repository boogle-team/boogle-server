import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class UpdateSensitiveInfoConsentRequestDto {
  @ApiProperty({ example: true })
  @Allow()
  agreed!: boolean;

  @ApiProperty({ example: '2026.07.15' })
  @Allow()
  policyVersion!: string;
}
