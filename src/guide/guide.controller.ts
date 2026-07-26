import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import {
  errorExample,
  errorExamples,
} from '@/common/swagger/error-example.util';
import { GetGuideScreenQueryDto } from './dto/get-guide-screen-query.dto';
import { GuideScreenResponseDto } from './dto/guide-screen-response.dto';
import { GetGuideDetailQueryDto } from './dto/get-guide-detail-query.dto';
import {
  type GuideDetailResponseDto,
  HealthGuideDetailResponseDto,
  PatternGuideDetailResponseDto,
  WarningGuideDetailResponseDto,
} from './dto/guide-detail-response.dto';
import { GuideFeedbackRequestDto } from './dto/guide-feedback-request.dto';
import {
  CreateGuideFeedbackResponseDto,
  DeleteGuideFeedbackResponseDto,
  UpdateGuideFeedbackResponseDto,
} from './dto/guide-feedback-response.dto';
import { GuideService } from './guide.service';
import {
  ApiSuccessOneOfResponse,
  ApiSuccessResponse,
} from '@/common/decorators/api-success-response.decorator';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const GUIDE_ID_ERROR_EXAMPLES = {
  GUIDE_INVALID_ID: 'guideId는 1 이상의 숫자여야 합니다.',
};

const GUIDE_NOT_FOUND_ERROR_EXAMPLES = {
  GUIDE_CONTENT_NOT_FOUND: '요청한 가이드를 찾을 수 없습니다.',
  GUIDE_CONTENT_INACTIVE: '현재 제공되지 않는 가이드입니다.',
};

@ApiTags('Guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guides')
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Get()
  @ApiOperation({
    summary: '가이드 화면 조회',
    description:
      '패턴 기반, 장 건강, 주의 신호 섹션을 반환합니다. 주간 통합 기록이 3일 미만이면 패턴 가이드만 빈 배열로 반환하고 장 건강/주의 신호 가이드는 모두 반환합니다. 월간 범위에서 주의 신호가 감지되면 sectionOrder의 첫 항목이 WARNING입니다.',
  })
  @ResponseMessage('가이드 화면 조회에 성공했습니다.')
  @ApiSuccessResponse({
    type: GuideScreenResponseDto,
    description: '가이드 화면 조회 성공',
    message: '가이드 화면 조회에 성공했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'weekStartDate, monthStartDate 또는 includeFeedback 값 오류',
    examples: {
      INVALID_WEEK_FORMAT: {
        summary: 'weekStartDate 형식 오류',
        value: errorExample(
          'GUIDE_INVALID_WEEK_FORMAT',
          'weekStartDate는 YYYY-MM-DD 형식이어야 합니다.',
        ),
      },
      INVALID_WEEKDAY: {
        summary: 'weekStartDate가 월요일이 아님',
        value: errorExample(
          'GUIDE_INVALID_WEEK_FORMAT',
          'weekStartDate는 월요일이어야 합니다.',
        ),
      },
      ...errorExamples({
        GUIDE_INVALID_MONTH_FORMAT:
          'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
        BAD_REQUEST: '요청 값이 올바르지 않습니다.',
      }),
    },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '가이드 화면 조회 중 서버 오류',
    examples: errorExamples({
      GUIDE_FETCH_FAILED: '가이드 화면 조회 중 오류가 발생했습니다.',
    }),
  })
  async getGuideScreen(
    @Query() query: GetGuideScreenQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideScreenResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.getGuideScreen(userId, query);
  }

  @Get(':guideId')
  @ApiOperation({
    summary: '가이드 상세 조회',
    description:
      'guideId로 가이드 기본 정보와 순서가 보장된 상세 본문을 조회합니다. 장 건강(H)은 다른 장 건강 가이드를 추천하고, 패턴(P)은 해당 주의 기록 상태와 감지 근거를, 주의 신호(W)는 해당 월의 감지 기록을 함께 반환합니다.',
  })
  @ResponseMessage('가이드 상세 조회에 성공했습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    required: true,
    description:
      '상세 조회할 활성 가이드 ID. 장 건강 3개, 패턴 기반 14개, 주의 신호 1개 중 하나',
    schema: {
      type: 'integer',
      minimum: 1,
      example: 3,
    },
  })
  @ApiSuccessOneOfResponse({
    types: [
      HealthGuideDetailResponseDto,
      PatternGuideDetailResponseDto,
      WarningGuideDetailResponseDto,
    ],
    discriminatorProperty: 'category',
    discriminatorMapping: {
      H: HealthGuideDetailResponseDto,
      P: PatternGuideDetailResponseDto,
      W: WarningGuideDetailResponseDto,
    },
    description:
      '가이드 상세 조회 성공. category 값에 따라 data 스키마가 달라집니다.',
    message: '가이드 상세 조회에 성공했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'guideId 또는 분석 기준 날짜 형식 오류',
    examples: {
      ...errorExamples(GUIDE_ID_ERROR_EXAMPLES),
      INVALID_WEEK_FORMAT: {
        summary: 'weekStartDate 형식 오류',
        value: errorExample(
          'GUIDE_INVALID_WEEK_FORMAT',
          'weekStartDate는 YYYY-MM-DD 형식이어야 합니다.',
        ),
      },
      INVALID_WEEKDAY: {
        summary: 'weekStartDate가 월요일이 아님',
        value: errorExample(
          'GUIDE_INVALID_WEEK_FORMAT',
          'weekStartDate는 월요일이어야 합니다.',
        ),
      },
      ...errorExamples({
        GUIDE_INVALID_MONTH_FORMAT:
          'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
      }),
    },
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '가이드가 존재하지 않거나 비활성 상태',
    examples: errorExamples(GUIDE_NOT_FOUND_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '가이드 상세 조회 중 서버 오류',
    examples: errorExamples({
      GUIDE_DETAIL_FETCH_FAILED: '가이드 상세 조회 중 오류가 발생했습니다.',
    }),
  })
  async getGuideDetail(
    @Param('guideId') guideId: string,
    @Query() query: GetGuideDetailQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideDetailResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.getGuideDetail(userId, guideId, query);
  }

  @Post(':guideId/feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '가이드 피드백 등록',
    description:
      '사용자와 가이드 조합당 하나의 피드백을 등록합니다. G는 도움됨, A는 이미 알고 있음, N은 잘 모르겠음을 의미합니다.',
  })
  @ResponseMessage('가이드 피드백이 등록되었습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    required: true,
    description: '피드백 대상 가이드 ID',
    schema: {
      type: 'integer',
      minimum: 1,
      example: 3,
    },
  })
  @ApiBody({
    type: GuideFeedbackRequestDto,
    examples: {
      helpful: {
        summary: '도움이 됨',
        value: {
          feedback: 'G',
        },
      },
      alreadyKnown: {
        summary: '이미 알고 있음',
        value: {
          feedback: 'A',
        },
      },
      unknown: {
        summary: '잘 모르겠음',
        value: {
          feedback: 'N',
        },
      },
    },
  })
  @ApiSuccessResponse({
    type: CreateGuideFeedbackResponseDto,
    status: HttpStatus.CREATED,
    description: '가이드 피드백 등록 성공',
    message: '가이드 피드백이 등록되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'guideId 또는 feedback 값 오류',
    examples: errorExamples({
      ...GUIDE_ID_ERROR_EXAMPLES,
      GUIDE_INVALID_FEEDBACK: 'feedback은 G, A, N 중 하나여야 합니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '가이드가 존재하지 않거나 비활성 상태',
    examples: errorExamples(GUIDE_NOT_FOUND_ERROR_EXAMPLES),
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: '같은 가이드에 피드백이 이미 존재함',
    examples: errorExamples({
      GUIDE_FEEDBACK_ALREADY_EXISTS:
        '이미 해당 가이드에 피드백을 등록했습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '가이드 피드백 등록 중 서버 오류',
    examples: errorExamples({
      GUIDE_FEEDBACK_CREATE_FAILED:
        '가이드 피드백 등록 중 오류가 발생했습니다.',
    }),
  })
  async createGuideFeedback(
    @Param('guideId') guideId: string,
    @Body() body: GuideFeedbackRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateGuideFeedbackResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.createGuideFeedback(userId, guideId, body);
  }

  @Patch(':guideId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '가이드 피드백 수정',
    description:
      '현재 사용자가 해당 가이드에 등록한 피드백을 G, A, N 중 하나로 변경합니다.',
  })
  @ResponseMessage('가이드 피드백이 수정되었습니다.')
  @ApiParam({
    name: 'guideId',
    required: true,
    type: Number,
    description: '피드백을 수정할 가이드 ID',
    schema: {
      type: 'integer',
      minimum: 1,
      example: 3,
    },
  })
  @ApiBody({
    type: GuideFeedbackRequestDto,
    examples: {
      default: {
        summary: '이미 알고 있음으로 변경',
        value: {
          feedback: 'A',
        },
      },
    },
  })
  @ApiSuccessResponse({
    type: UpdateGuideFeedbackResponseDto,
    description: '가이드 피드백 수정 성공',
    message: '가이드 피드백이 수정되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'guideId 또는 feedback 값 오류',
    examples: errorExamples({
      ...GUIDE_ID_ERROR_EXAMPLES,
      GUIDE_INVALID_FEEDBACK: 'feedback은 G, A, N 중 하나여야 합니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      '가이드가 없거나 비활성 상태이거나 수정할 피드백이 존재하지 않음',
    examples: errorExamples({
      ...GUIDE_NOT_FOUND_ERROR_EXAMPLES,
      GUIDE_FEEDBACK_NOT_FOUND: '수정할 가이드 피드백을 찾을 수 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '가이드 피드백 수정 중 서버 오류',
    examples: errorExamples({
      GUIDE_FEEDBACK_UPDATE_FAILED:
        '가이드 피드백 수정 중 오류가 발생했습니다.',
    }),
  })
  async updateGuideFeedback(
    @Param('guideId') guideId: string,
    @Body() body: GuideFeedbackRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UpdateGuideFeedbackResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.updateGuideFeedback(userId, guideId, body);
  }

  @Delete(':guideId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '가이드 피드백 삭제',
    description: '현재 사용자가 해당 가이드에 등록한 피드백을 삭제합니다.',
  })
  @ResponseMessage('가이드 피드백이 삭제되었습니다.')
  @ApiParam({
    name: 'guideId',
    required: true,
    type: Number,
    description: '피드백을 삭제할 가이드 ID',
    schema: {
      type: 'integer',
      minimum: 1,
      example: 3,
    },
  })
  @ApiSuccessResponse({
    type: DeleteGuideFeedbackResponseDto,
    description: '가이드 피드백 삭제 성공',
    message: '가이드 피드백이 삭제되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'guideId 형식 오류',
    examples: errorExamples(GUIDE_ID_ERROR_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description:
      '가이드가 없거나 비활성 상태이거나 삭제할 피드백이 존재하지 않음',
    examples: errorExamples({
      ...GUIDE_NOT_FOUND_ERROR_EXAMPLES,
      GUIDE_FEEDBACK_NOT_FOUND: '삭제할 가이드 피드백을 찾을 수 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '가이드 피드백 삭제 중 서버 오류',
    examples: errorExamples({
      GUIDE_FEEDBACK_DELETE_FAILED:
        '가이드 피드백 삭제 중 오류가 발생했습니다.',
    }),
  })
  async deleteGuideFeedback(
    @Param('guideId') guideId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeleteGuideFeedbackResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.deleteGuideFeedback(userId, guideId);
  }
}
