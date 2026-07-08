import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '@/common/decorators/current-user-id.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { LifeRecordService } from './life-record.service';
import { CreateLifeRecordDto } from './dto/create-life-record.dto';
import { UpdateLifeRecordDto } from './dto/update-life-record.dto';
import { ExtractTagsRequestDto } from './dto/extract-tags.dto';
import { LifeRecordListQueryDto } from './dto/life-record-list-query.dto';

@ApiTags('life-record')
@ApiBearerAuth()
@ApiHeader({ name: 'x-user-id', description: '임시 로그인 사용자 ID' })
@Controller('life-records')
export class LifeRecordController {
  constructor(private readonly lifeRecordService: LifeRecordService) {}

  @Post()
  @ApiOperation({ summary: '생활기록 생성' })
  @ResponseMessage('생활 기록이 저장되었습니다.')
  create(@CurrentUserId() userId: number, @Body() dto: CreateLifeRecordDto) {
    return this.lifeRecordService.create(userId, dto);
  }

  @Post('tags/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI 태그 추출' })
  @ResponseMessage('태그 추출에 성공했습니다.')
  extractTags(
    @CurrentUserId() _userId: number,
    @Body() dto: ExtractTagsRequestDto,
  ) {
    return this.lifeRecordService.extractTags(dto.text);
  }

  @Get()
  @ApiOperation({ summary: '생활기록 목록 조회' })
  @ResponseMessage('생활 기록 목록 조회에 성공했습니다.')
  findAll(
    @CurrentUserId() userId: number,
    @Query() query: LifeRecordListQueryDto,
  ) {
    return this.lifeRecordService.findAll(userId, query);
  }

  @Get(':lifeId')
  @ApiOperation({ summary: '생활기록 상세 조회' })
  @ResponseMessage('생활 기록 상세 조회에 성공했습니다.')
  findOne(
    @CurrentUserId() userId: number,
    @Param('lifeId', ParseIntPipe) lifeId: number,
  ) {
    return this.lifeRecordService.findOne(userId, lifeId);
  }

  @Patch(':lifeId')
  @ApiOperation({ summary: '생활기록 수정' })
  @ResponseMessage('생활 기록이 수정되었습니다.')
  update(
    @CurrentUserId() userId: number,
    @Param('lifeId', ParseIntPipe) lifeId: number,
    @Body() dto: UpdateLifeRecordDto,
  ) {
    return this.lifeRecordService.update(userId, lifeId, dto);
  }

  @Delete(':lifeId')
  @ApiOperation({ summary: '생활기록 삭제' })
  @ResponseMessage('생활 기록이 삭제되었습니다.')
  remove(
    @CurrentUserId() userId: number,
    @Param('lifeId', ParseIntPipe) lifeId: number,
  ) {
    return this.lifeRecordService.remove(userId, lifeId);
  }
}
