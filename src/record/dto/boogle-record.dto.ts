import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

// 부글 기록 생성 dto
export class CreateRecordDto {
  @ApiProperty({
    example: '2026-07-10',
    description: 'YYYY-MM-DD',
  })
  @IsString()
  regDate!: string;

  @ApiProperty({
    example: true,
    description: '배변 여부',
  })
  @IsBoolean()
  hasBowel!: boolean;

  @ApiPropertyOptional({
    example: 4,
    description: '변 상태 (1~7)',
  })
  @IsOptional()
  @IsInt()
  stoolBristol?: number;

  @ApiPropertyOptional({
    example: 'C',
    description: '배변 느낌 편안 C / 보통 N / 힘듦 H',
  })
  @IsOptional()
  @IsString()
  bowelFeeling?: string;

  @ApiPropertyOptional({
    example: 'N',
    description: '복통 없음 N / 중간 M / 심함 L',
  })
  @IsOptional()
  @IsString()
  stomach?: string;

  @ApiPropertyOptional({
    example: 'L',
    description: '복부팽만 N / M / L',
  })
  @IsOptional()
  @IsString()
  distension?: string;

  @ApiPropertyOptional({
    example: 'N',
    description: '잔변감 N / M / L',
  })
  @IsOptional()
  @IsString()
  remainingFeeling?: string;

  @ApiPropertyOptional({
    example: 'M',
    description: '급박감 N / M / L',
  })
  @IsOptional()
  @IsString()
  urgency?: string;

  @ApiPropertyOptional({
    example: 5,
    description: '배변 소요 시간',
  })
  @IsOptional()
  @IsInt()
  takenTime?: number;

  @ApiPropertyOptional({
    example: 'M',
    description: '배변 양 적음 S / 보통 N / 많음 M',
  })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({
    example: 'B',
    description: '변 색상 갈색 B / 어두운색 D / 검은색 N / 붉은색 R / 회색 G',
  })
  @IsOptional()
  @IsString()
  color?: string;
}

// 부글 기록 수정 dto
export class UpdateRecordDto extends PartialType(CreateRecordDto) {}
