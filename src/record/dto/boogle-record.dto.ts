import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// 부글 기록 생성 dto
export class CreateRecordDto {
  @ApiProperty({
    example: '2026-07-10',
    description: 'YYYY-MM-DD',
  })
  @IsDateString()
  regDate!: string;

  @ApiProperty({
    example: true,
    description: '배변 여부',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasBowel!: boolean;

  @ApiPropertyOptional({
    example: '15:30',
    description: '배변 시간',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'bowelMovementAt must be HH:mm format',
  })
  bowelMovementAt?: string | null;

  @ApiPropertyOptional({
    example: 4,
    description: '변 상태 (1~7)',
  })
  @IsOptional()
  @IsInt()
  stoolBristol?: number | null;

  @ApiPropertyOptional({
    example: 'C',
    description: '배변 느낌 편안 C / 보통 N / 힘듦 H',
  })
  @IsOptional()
  @IsString()
  bowelFeeling?: string | null;

  @ApiPropertyOptional({
    example: '0',
    description: '복통 없음 0 / 중간 1~3 / 심함 4',
  })
  @IsOptional()
  @IsInt()
  stomach?: number | null;

  @ApiPropertyOptional({
    example: 'L',
    description: '복부팽만 N / M / L',
  })
  @IsOptional()
  @IsString()
  distension?: string | null;

  @ApiPropertyOptional({
    example: 'N',
    description: '잔변감 N / M / L',
  })
  @IsOptional()
  @IsString()
  remainingFeeling?: string | null;

  @ApiPropertyOptional({
    example: 'M',
    description: '급박감 N / M / L',
  })
  @IsOptional()
  @IsString()
  urgency?: string | null;

  @ApiPropertyOptional({
    example: 5,
    description: '배변 소요 시간',
  })
  @IsOptional()
  @IsInt()
  takenTime?: number | null;

  @ApiPropertyOptional({
    example: 'M',
    description: '배변 양 적음 S / 보통 N / 많음 M',
  })
  @IsOptional()
  @IsString()
  amount?: string | null;

  @ApiPropertyOptional({
    example: 'B',
    description: '변 색상 갈색 B / 어두운색 D / 검은색 N / 붉은색 R / 회색 G',
  })
  @IsOptional()
  @IsString()
  color?: string | null;
}

// 부글 기록 수정 dto
export class UpdateRecordDto extends PartialType(CreateRecordDto) {}
