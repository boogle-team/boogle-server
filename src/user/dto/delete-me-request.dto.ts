import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DeleteMeRequestDto {
  @ApiPropertyOptional({
    enum: [
      'RECORDING_INCONVENIENT',
      'NO_NEEDED_INFO',
      'USING_OTHER_APP',
      'OTHER',
    ],
  })
  @IsOptional()
  @IsIn([
    'RECORDING_INCONVENIENT',
    'NO_NEEDED_INFO',
    'USING_OTHER_APP',
    'OTHER',
  ])
  reason?:
    'RECORDING_INCONVENIENT' | 'NO_NEEDED_INFO' | 'USING_OTHER_APP' | 'OTHER';

  @ApiProperty({ example: '탈퇴합니다' })
  @IsString({ message: 'WITHDRAWAL_CONFIRMATION_INVALID' })
  confirmation!: string;
}
