import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RecordService } from './record.service';
import { CreateRecordDto } from './dto/boogle-record.dto';

@ApiTags('record')
@ApiBearerAuth()
@ApiHeader({ name: 'x-user-id', description: '임시 로그인 사용자 ID' })
@Controller('records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @ApiOperation({ summary: '부글 기록 생성' })
  @ApiBody({ type: CreateRecordDto })
  create(@Headers('x-user-id') userId: string, @Body() dto: CreateRecordDto) {
    return this.recordService.create(Number(userId), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '부글 기록 조회' })
  findOne(
    @Headers('x-user-id') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordService.findOne(Number(userId), id);
  }
}
