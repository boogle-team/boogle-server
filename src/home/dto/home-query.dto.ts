import { IsDateString, IsOptional } from 'class-validator';

export class HomeQueryDto {
  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;
}
