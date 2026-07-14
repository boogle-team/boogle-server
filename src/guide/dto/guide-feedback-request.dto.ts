import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class GuideFeedbackRequestDto {
  @ApiProperty({
    description: '가이드 피드백',
    enum: ['G', 'A', 'N'],
    example: 'G',
  })
  @Allow()
  feedback!: unknown;
}
