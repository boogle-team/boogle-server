import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteMeRequestDto {
  @ApiProperty({
    enum: [
      'RECORDING_INCONVENIENT',
      'NO_NEEDED_INFO',
      'USING_OTHER_APP',
      'OTHER',
    ],
  })
  @IsNotEmpty({ message: 'WITHDRAWAL_REASON_REQUIRED' })
  @IsIn([
    'RECORDING_INCONVENIENT',
    'NO_NEEDED_INFO',
    'USING_OTHER_APP',
    'OTHER',
  ])
  reason!:
    'RECORDING_INCONVENIENT' | 'NO_NEEDED_INFO' | 'USING_OTHER_APP' | 'OTHER';

  @ApiPropertyOptional({
    example: '다른 서비스가 더 편리해요.',
    description: 'reason이 OTHER일 때 필수',
  })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiProperty({ example: '탈퇴합니다' })
  @IsString({ message: 'WITHDRAWAL_CONFIRMATION_INVALID' })
  confirmation!: string;
}
