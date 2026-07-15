import { ApiProperty } from '@nestjs/swagger';

export class SensitiveInfoConsentDataDto {
  @ApiProperty({
    description: '현재 민감정보 수집 동의 여부',
    example: true,
  })
  agreed: boolean;

  @ApiProperty({
    description: '최근 확인한 민감정보 정책 버전',
    example: '2026.06.22',
  })
  policyVersion: string;

  @ApiProperty({
    description: '최근 동의 일시',
    example: '2026-06-20T10:30:00.000Z',
    nullable: true,
    type: String,
  })
  agreedAt: string | null;

  @ApiProperty({
    description: '최근 동의 철회 일시',
    example: null,
    nullable: true,
    type: String,
  })
  withdrawnAt: string | null;
}

export class SensitiveInfoConsentSuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SensitiveInfoConsentDataDto })
  data: SensitiveInfoConsentDataDto;

  @ApiProperty({
    example: '민감정보 수집 동의 상태 조회에 성공했습니다.',
  })
  message: string;
}
