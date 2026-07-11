import { IsDateString, IsOptional, Matches } from 'class-validator';

export class HomeQueryDto {
  @IsOptional()
  // IsDateString(ISO 8601)만으로는 "2026-05-12T00:00:00Z" 같은 datetime도
  // 통과되므로, 명세대로 YYYY-MM-DD 형식만 받도록 별도로 고정한다.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date는 YYYY-MM-DD 형식이어야 합니다.',
  })
  @IsDateString({ strict: true })
  date?: string;
}
