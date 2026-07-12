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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { LifeRecordService } from './life-record.service';
import { CreateLifeRecordDto } from './dto/create-life-record.dto';
import { UpdateLifeRecordDto } from './dto/update-life-record.dto';
import {
  ExtractTagsRequestDto,
  ExtractTagsResponseDto,
} from './dto/extract-tags.dto';
import { LifeRecordListQueryDto } from './dto/life-record-list-query.dto';
import {
  LifeRecordDetailResponseDto,
  LifeRecordListResponseDto,
  LifeRecordUpdateResponseDto,
} from './dto/life-record-response.dto';

const TOKEN_UNAUTHORIZED_DESCRIPTION =
  'token 누락 또는 유효하지 않거나 만료된 token';

@ApiTags('생활 기록')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('life-records')
export class LifeRecordController {
  constructor(private readonly lifeRecordService: LifeRecordService) {}

  @Post()
  @ApiOperation({
    summary: '생활기록 생성',
    description:
      '하루에 한 건만 생성할 수 있습니다. 같은 날짜(regDate)로 이미 생성된 기록이 있으면 409가 반환되므로, 생성 전에 목록/상세 조회로 존재 여부를 확인해야 합니다. foodIds/medicineIds에 존재하지 않는 ID를 보내도 에러 없이 조용히 무시되므로 주의가 필요합니다.',
  })
  @ResponseMessage('생활 기록이 저장되었습니다.')
  @ApiCreatedResponse({
    type: LifeRecordDetailResponseDto,
    description: '생활 기록 생성 성공',
  })
  @ApiBadRequestResponse({
    description:
      'regDate 형식이 올바르지 않거나(INVALID_DATE_FORMAT), 생활 기록 항목 값이 올바르지 않음(INVALID_LIFE_VALUE)',
  })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  @ApiConflictResponse({
    description:
      '해당 날짜의 생활 기록이 이미 존재함(LIFE_RECORD_ALREADY_EXISTS)',
  })
  @ApiInternalServerErrorResponse({
    description: '생활 기록 저장 중 오류 발생(LIFE_RECORD_CREATE_FAILED)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLifeRecordDto,
  ) {
    return this.lifeRecordService.create(user.id, dto);
  }

  @Post('tags/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI 태그 추출',
    description:
      '메모(text)를 보내면 AI가 태그 후보를 추천합니다. 이 API는 추천만 할 뿐 DB에 저장하지 않으므로, 사용자가 실제로 선택한 태그는 생활기록 생성/수정 API의 tagNames에 담아 별도로 저장해야 합니다.',
  })
  @ResponseMessage('태그 추출에 성공했습니다.')
  @ApiOkResponse({
    type: ExtractTagsResponseDto,
    description: 'AI 태그 추출 성공',
  })
  @ApiBadRequestResponse({
    description:
      '태그를 추출할 문장이 없거나(TEXT_REQUIRED), 255자를 초과함(TEXT_TOO_LONG)',
  })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  @ApiInternalServerErrorResponse({
    description: 'AI 태그 추출 실패(TAG_EXTRACTION_FAILED)',
  })
  extractTags(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: ExtractTagsRequestDto,
  ) {
    return this.lifeRecordService.extractTags(dto.text);
  }

  @Get()
  @ApiOperation({
    summary: '생활기록 목록 조회',
    description:
      'startDate/endDate로 기간을 필터링하고 page/size로 페이지네이션할 수 있습니다. 파라미터를 보내지 않으면 전체 기간을 최신순으로 10개씩 반환합니다.',
  })
  @ResponseMessage('생활 기록 목록 조회에 성공했습니다.')
  @ApiOkResponse({
    type: LifeRecordListResponseDto,
    description: '생활 기록 목록 조회 성공',
  })
  @ApiBadRequestResponse({
    description: 'startDate/endDate 형식이 올바르지 않음(INVALID_DATE_FORMAT)',
  })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LifeRecordListQueryDto,
  ) {
    return this.lifeRecordService.findAll(user.id, query);
  }

  @Get(':lifeId')
  @ApiParam({
    name: 'lifeId',
    type: Number,
    description: '생활 기록 ID',
    example: 15,
  })
  @ApiOperation({
    summary: '생활기록 상세 조회',
    description:
      '본인이 작성한 기록만 조회할 수 있습니다. 다른 사용자의 기록 ID로 요청하면 403이 반환됩니다.',
  })
  @ResponseMessage('생활 기록 상세 조회에 성공했습니다.')
  @ApiOkResponse({
    type: LifeRecordDetailResponseDto,
    description: '생활 기록 상세 조회 성공',
  })
  @ApiBadRequestResponse({ description: 'lifeId가 숫자 형식이 아님' })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  @ApiForbiddenResponse({
    description: '다른 사용자의 생활 기록에 접근함(LIFE_RECORD_FORBIDDEN)',
  })
  @ApiNotFoundResponse({
    description: '생활 기록을 찾을 수 없음(LIFE_RECORD_NOT_FOUND)',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lifeId', ParseIntPipe) lifeId: number,
  ) {
    return this.lifeRecordService.findOne(user.id, lifeId);
  }

  @Patch(':lifeId')
  @ApiParam({
    name: 'lifeId',
    type: Number,
    description: '생활 기록 ID',
    example: 15,
  })
  @ApiOperation({
    summary: '생활기록 수정',
    description:
      '보낸 필드만 부분 수정됩니다(PATCH). 단, tagNames/foodIds/medicineIds는 부분 수정이 아니라 보낸 배열로 전체 교체됩니다. 일부만 유지하려면 유지할 항목까지 포함해서 배열 전체를 보내야 합니다.',
  })
  @ResponseMessage('생활 기록이 수정되었습니다.')
  @ApiOkResponse({
    type: LifeRecordUpdateResponseDto,
    description: '생활 기록 수정 성공',
  })
  @ApiBadRequestResponse({
    description:
      'lifeId가 숫자 형식이 아니거나, 생활 기록 항목 값이 올바르지 않음(INVALID_LIFE_VALUE)',
  })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  @ApiForbiddenResponse({
    description: '다른 사용자의 생활 기록에 접근함(LIFE_RECORD_FORBIDDEN)',
  })
  @ApiNotFoundResponse({
    description: '생활 기록을 찾을 수 없음(LIFE_RECORD_NOT_FOUND)',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lifeId', ParseIntPipe) lifeId: number,
    @Body() dto: UpdateLifeRecordDto,
  ) {
    return this.lifeRecordService.update(user.id, lifeId, dto);
  }

  @Delete(':lifeId')
  @ApiParam({
    name: 'lifeId',
    type: Number,
    description: '생활 기록 ID',
    example: 15,
  })
  @ApiOperation({
    summary: '생활기록 삭제',
    description:
      '실제로 DB에서 삭제하지 않고 상태만 변경하는 소프트 삭제입니다. 삭제 후에는 목록/상세 조회에 더 이상 노출되지 않습니다.',
  })
  @ResponseMessage('생활 기록이 삭제되었습니다.')
  @ApiOkResponse({ description: '생활 기록 삭제 성공' })
  @ApiBadRequestResponse({ description: 'lifeId가 숫자 형식이 아님' })
  @ApiUnauthorizedResponse({ description: TOKEN_UNAUTHORIZED_DESCRIPTION })
  @ApiForbiddenResponse({
    description: '다른 사용자의 생활 기록에 접근함(LIFE_RECORD_FORBIDDEN)',
  })
  @ApiNotFoundResponse({
    description: '생활 기록을 찾을 수 없음(LIFE_RECORD_NOT_FOUND)',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lifeId', ParseIntPipe) lifeId: number,
  ) {
    return this.lifeRecordService.remove(user.id, lifeId);
  }
}
