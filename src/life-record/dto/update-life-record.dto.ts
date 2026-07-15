import { OmitType } from '@nestjs/swagger';
import { CreateLifeRecordDto } from './create-life-record.dto';

export class UpdateLifeRecordDto extends OmitType(CreateLifeRecordDto, [
  'regDate',
] as const) {}
