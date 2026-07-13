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
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
// import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { Request } from 'express';
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
@Controller('guides')
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Get()
  @ApiOperation({ summary: '가이드 화면 조회' })
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
  // @ResponseMessage('가이드 조회에 성공했습니다.')
  async getGuideScreen(
    @Query() query: GetGuideScreenQueryDto,
    @Req() req: Request,
  ): Promise<GuideScreenResponseDto> {
    const userId = this.extractUserId(req);

    return this.guideService.getGuideScreen(userId, query);
  }

  @Get(':guideContentId')
  @ApiOperation({ summary: '가이드 상세 조회' })
  @ApiParam({
    name: 'guideContentId',
    type: Number,
    description: '조회할 가이드 콘텐츠 ID',
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
  @ApiQuery({
    name: 'ruleCode',
    required: false,
    description: '선택한 패턴 가이드의 규칙 코드',
    example: 'LOW_SLEEP',
  })
  // @ResponseMessage('가이드 상세 조회에 성공했습니다.')
  async getGuideDetail(
    @Param('guideContentId') guideContentId: string,
    @Query() query: GetGuideDetailQueryDto,
    @Req() req: Request,
  ): Promise<GuideDetailResponseDto> {
    const userId = this.extractUserId(req);

    return this.guideService.getGuideDetail(userId, guideContentId, query);
  }

  @Post(':guideContentId/feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '가이드 피드백 등록' })
  @ApiParam({
    name: 'guideContentId',
    type: Number,
    description: '피드백 대상 가이드 콘텐츠 ID',
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
  // @ResponseMessage('피드백 등록을 성공했습니다.')
  async createGuideFeedback(
    @Param('guideContentId') guideContentId: string,
    @Body() body: GuideFeedbackRequestDto,
    @Req() req: Request,
  ): Promise<CreateGuideFeedbackResponseDto> {
    const userId = this.extractUserId(req);

    return this.guideService.createGuideFeedback(userId, guideContentId, body);
  }

  @Patch(':guideContentId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '가이드 피드백 수정' })
  @ApiParam({
    name: 'guideContentId',
    type: Number,
    description: '피드백을 수정할 가이드 콘텐츠 ID',
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
  // @ResponseMessage('피드백 수정을 성공했습니다.')
  async updateGuideFeedback(
    @Param('guideContentId') guideContentId: string,
    @Body() body: GuideFeedbackRequestDto,
    @Req() req: Request,
  ): Promise<UpdateGuideFeedbackResponseDto> {
    const userId = this.extractUserId(req);

    return this.guideService.updateGuideFeedback(userId, guideContentId, body);
  }

  @Delete(':guideContentId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '가이드 피드백 삭제' })
  @ApiParam({
    name: 'guideContentId',
    type: Number,
    description: '피드백을 삭제할 가이드 콘텐츠 ID',
    example: 3,
  })
  async deleteGuideFeedback(
    @Param('guideContentId') guideContentId: string,
    @Req() req: Request,
  ): Promise<DeleteGuideFeedbackResponseDto> {
    const userId = this.extractUserId(req);

    return this.guideService.deleteGuideFeedback(userId, guideContentId);
  }

  private extractUserId(req: Request): bigint {
    const userId = req.user?.id;

    if (userId === undefined) {
      throw new UnauthorizedException();
    }

    return userId;
  }
}
