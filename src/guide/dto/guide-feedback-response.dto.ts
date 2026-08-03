import { ApiProperty } from '@nestjs/swagger';
import type { GuideFeedbackStatus } from './guide-screen-response.dto';

export class CreateGuideFeedbackResponseDto {
  @ApiProperty({
    type: String,
    example: '42',
    description:
      '생성된 가이드 피드백 ID. BigInt 정밀도 손실을 피하기 위해 문자열로 반환',
  })
  guideFeedbackId!: string;

  @ApiProperty({
    type: Number,
    example: 101,
    minimum: 1,
    description: '피드백 대상 패턴 기반 가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    enum: ['G', 'A', 'N'],
    example: 'G',
    description: '등록된 피드백. G 도움됨, A 이미 알고 있음, N 잘 모르겠음',
  })
  feedback!: GuideFeedbackStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-27T04:05:30.000Z',
    description: '피드백 등록 일시(ISO DateTime)',
  })
  regDate!: string;
}

export class UpdateGuideFeedbackResponseDto {
  @ApiProperty({
    type: String,
    example: '42',
    description:
      '수정된 가이드 피드백 ID. BigInt 정밀도 손실을 피하기 위해 문자열로 반환',
  })
  guideFeedbackId!: string;

  @ApiProperty({
    type: Number,
    example: 101,
    minimum: 1,
    description: '피드백 대상 패턴 기반 가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    enum: ['G', 'A', 'N'],
    example: 'A',
    description: '수정된 피드백. G 도움됨, A 이미 알고 있음, N 잘 모르겠음',
  })
  feedback!: GuideFeedbackStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-27T04:05:30.000Z',
    description: '최초 피드백 등록 일시(ISO DateTime)',
  })
  regDate!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-27T04:15:20.000Z',
    description: '피드백 수정 일시(ISO DateTime)',
  })
  updatedAt!: string;
}

export class DeleteGuideFeedbackResponseDto {
  @ApiProperty({
    type: String,
    example: '42',
    description:
      '삭제된 가이드 피드백 ID. BigInt 정밀도 손실을 피하기 위해 문자열로 반환',
  })
  guideFeedbackId!: string;

  @ApiProperty({
    type: Number,
    example: 101,
    minimum: 1,
    description: '피드백 대상 패턴 기반 가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: '삭제 성공 시 항상 true',
  })
  deleted!: true;
}
