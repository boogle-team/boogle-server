import { IsDateString, IsOptional, Matches } from 'class-validator';

export class HomeSummaryQueryDto {
  @IsOptional()
  // IsDateString(ISO 8601)만으로는 datetime도 통과되므로, 명세대로
  // YYYY-MM-DD 형식만 받도록 고정한다. (home-query.dto와 동일 규칙)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'baseDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  @IsDateString({ strict: true })
  baseDate?: string;
}
