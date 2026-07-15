import { ApiProperty } from '@nestjs/swagger';

export class RecordResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: '2026-07-10' })
  regDate!: string;

  @ApiProperty({ example: true })
  hasBowel!: boolean;

  @ApiProperty({ nullable: true, example: 4 })
  stoolBristol!: number | null;

  @ApiProperty({ nullable: true, example: 'M' })
  stoolSimple!: string | null;

  @ApiProperty({ nullable: true, example: 'C' })
  bowelFeeling!: string | null;

  @ApiProperty({ nullable: true, example: 'N' })
  stomach!: string | null;

  @ApiProperty({ nullable: true, example: 'N' })
  distension!: string | null;

  @ApiProperty({ nullable: true, example: 'N' })
  remainingFeeling!: string | null;

  @ApiProperty({ nullable: true, example: 'N' })
  urgency!: string | null;

  @ApiProperty({ nullable: true, example: 5 })
  takenTime!: number | null;

  @ApiProperty({ nullable: true, example: 'N' })
  amount!: string | null;

  @ApiProperty({ nullable: true, example: 'B' })
  color!: string | null;

  @ApiProperty({ nullable: true, example: 'A' })
  status!: string | null;

  @ApiProperty({ example: '2026-07-10T10:35:00.000Z' })
  updatedAt!: string;
}
