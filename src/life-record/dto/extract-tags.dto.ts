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
  @ApiProperty()
  originalText: string;

  @ApiProperty({ type: [ExtractedTagDto] })
  tags: ExtractedTagDto[];

  @ApiProperty({ type: [String] })
  tagNames: string[];

  @ApiProperty()
  autoTags: string;
}
