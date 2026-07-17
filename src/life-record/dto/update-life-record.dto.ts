import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateLifeRecordDto } from './create-life-record.dto';

export class UpdateLifeRecordDto extends PartialType(
  OmitType(CreateLifeRecordDto, ['regDate'] as const),
) {}
