import { ApiProperty } from '@nestjs/swagger';

export class TodayTagsResponseDto {
  @ApiProperty({
    type: [String],
    example: ['음주', '야식'],
    description:
      '해당 날짜 생활기록에 사용자가 최종 선택/입력해 저장한 태그 목록. 기록이 없으면 빈 배열.',
  })
  tagNames: string[];
}
