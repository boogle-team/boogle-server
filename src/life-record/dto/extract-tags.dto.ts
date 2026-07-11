import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExtractTagsRequestDto {
  @ApiProperty({
    example:
      '어제 잠을 거의 못 자고 커피를 두 잔 마셨다. 저녁에는 매운 음식을 먹었다.',
  })
  @IsOptional()
  @IsString()
  text?: string;
}

export class ExtractedTagDto {
  @ApiProperty({ example: '수면 부족' })
  name: string;

  @ApiProperty({ example: 0.94 })
  confidence: number;
}

export class ExtractTagsResponseDto {
  @ApiProperty({
    example:
      '어제 잠을 거의 못 자고 커피를 두 잔 마셨다. 저녁에는 매운 음식을 먹었다.',
  })
  originalText: string;

  @ApiProperty({
    type: [ExtractedTagDto],
    example: [
      { name: '수면 부족', confidence: 0.94 },
      { name: '카페인', confidence: 0.88 },
      { name: '매운 음식', confidence: 0.81 },
    ],
  })
  tags: ExtractedTagDto[];

  @ApiProperty({
    type: [String],
    example: ['수면 부족', '카페인', '매운 음식'],
  })
  tagNames: string[];

  @ApiProperty({ example: '수면 부족,카페인,매운 음식' })
  autoTags: string;
}
