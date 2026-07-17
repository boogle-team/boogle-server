import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MedicineListQueryDto {
  @ApiPropertyOptional({ example: '유산균', description: '약/영양제명 검색어' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
