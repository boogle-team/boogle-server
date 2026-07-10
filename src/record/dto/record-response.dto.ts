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

  @ApiProperty({ nullable: true, example: 4 })
  stoolSimple!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  bowlFeeling!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  stomach!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  distension!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  remainingFeeling!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  urgency!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  takenTime!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  amount!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  color!: number | null;

  @ApiProperty({ nullable: true, example: 4 })
  status!: number | null;

  @ApiProperty({ example: '2026-07-10T10:35:00.000Z' })
  updatedAt!: Date;
}
