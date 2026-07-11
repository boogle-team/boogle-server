import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateRecordDto, UpdateRecordDto } from './dto/boogle-record.dto';

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

  @Patch(':id')
  @ApiOperation({ summary: '부글 기록 수정' })
  @ApiBody({ type: UpdateRecordDto })
  update(
    @Headers('x-user-id') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordService.update(Number(userId), id, dto);
  }
}
