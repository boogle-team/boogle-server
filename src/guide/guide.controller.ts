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
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { GetGuideScreenQueryDto } from './dto/get-guide-screen-query.dto';
import { GuideScreenResponseDto } from './dto/guide-screen-response.dto';
import { GetGuideDetailQueryDto } from './dto/get-guide-detail-query.dto';
import { GuideDetailResponseDto } from './dto/guide-detail-response.dto';
import { GuideFeedbackRequestDto } from './dto/guide-feedback-request.dto';
import {
  CreateGuideFeedbackResponseDto,
  DeleteGuideFeedbackResponseDto,
  UpdateGuideFeedbackResponseDto,
} from './dto/guide-feedback-response.dto';
import { GuideService } from './guide.service';

@ApiTags('Guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guides')
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Get()
  @ApiOperation({ summary: '가이드 화면 조회' })
  @ResponseMessage('가이드 화면 조회에 성공했습니다.')
  @ApiQuery({
    name: 'weekStartDate',
    required: false,
    description: '패턴 가이드 기준 주 시작일. YYYY-MM-DD 형식',
    example: '2026-07-06',
  })
  @ApiQuery({
    name: 'monthStartDate',
    required: false,
    description: '주의 신호 기준 월 시작일. YYYY-MM-01 형식',
    example: '2026-07-01',
  })
  @ApiQuery({
    name: 'includeFeedback',
    required: false,
    description: '기존 피드백 포함 여부. 기본값 true',
    example: true,
  })
  async getGuideScreen(
    @Query() query: GetGuideScreenQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideScreenResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.getGuideScreen(userId, query);
  }

  @Get(':guideId')
  @ApiOperation({ summary: '가이드 상세 조회' })
  @ResponseMessage('가이드 상세 조회에 성공했습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    description: '조회할 가이드 ID',
    example: 3,
  })
  @ApiQuery({
    name: 'weekStartDate',
    required: false,
    description: '패턴 가이드 판단 기준 주. YYYY-MM-DD 형식',
    example: '2026-07-06',
  })
  @ApiQuery({
    name: 'monthStartDate',
    required: false,
    description: '주의 신호 판단 기준 월. YYYY-MM-01 형식',
    example: '2026-07-01',
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
  @ApiOperation({ summary: '가이드 피드백 등록' })
  @ResponseMessage('가이드 피드백이 등록되었습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    description: '피드백 대상 가이드 ID',
    example: 3,
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
  @ApiOperation({ summary: '가이드 피드백 수정' })
  @ResponseMessage('가이드 피드백이 수정되었습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    description: '피드백을 수정할 가이드 ID',
    example: 3,
  })
  @ApiBody({
    type: GuideFeedbackRequestDto,
    examples: {
      default: {
        value: {
          feedback: 'A',
        },
      },
    },
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
  @ApiOperation({ summary: '가이드 피드백 삭제' })
  @ResponseMessage('가이드 피드백이 삭제되었습니다.')
  @ApiParam({
    name: 'guideId',
    type: Number,
    description: '피드백을 삭제할 가이드 ID',
    example: 3,
  })
  async deleteGuideFeedback(
    @Param('guideId') guideId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeleteGuideFeedbackResponseDto> {
    const userId = BigInt(user.id);

    return this.guideService.deleteGuideFeedback(userId, guideId);
  }
}
