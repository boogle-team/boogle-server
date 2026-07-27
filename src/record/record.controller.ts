import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecordService } from './record.service';
import { CreateRecordDto, UpdateRecordDto } from './dto/boogle-record.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';

@ApiTags('record')
@ApiBearerAuth()
@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @ApiOperation({ summary: '부글 기록 생성' })
  @ApiBody({ type: CreateRecordDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecordDto) {
    return this.recordService.create(Number(user.id), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '부글 기록 조회' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordService.findOne(Number(user.id), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '부글 기록 수정' })
  @ApiBody({ type: UpdateRecordDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordService.update(Number(user.id), id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '부글 기록 삭제' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recordService.remove(Number(user.id), id);
  }
}
