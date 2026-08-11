import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { errorExamples } from '@/common/swagger/error-example.util';
import { HomeQueryDto } from './dto/home-query.dto';
import { HomeResponseDto } from './dto/home-response.dto';
import { HomeSummaryQueryDto } from './dto/home-summary-query.dto';
import { HomeSummaryResponseDto } from './dto/home-summary-response.dto';
import { HomeService } from './home.service';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const DATE_ERROR_EXAMPLES = {
  BAD_REQUEST: '요청 값이 올바르지 않습니다.',
};

@ApiTags('홈')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiOperation({
    summary: '홈 화면 조회',
    description:
      '홈 화면에 필요한 데이터를 한 번에 반환합니다. 사용자 정보, 주간 날짜 스트립(7일), 기준 날짜의 부글 기록 목록, 생활 기록 요약, 이번 주 대표 패턴을 포함합니다. 부글 기록의 시각은 regDate가 아니라 bowelMovementAt을 사용합니다.',
  })
  @ApiSuccessResponse({
    type: HomeResponseDto,
    description: '홈 화면 조회 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'date 형식 오류(YYYY-MM-DD가 아님)',
    examples: errorExamples(DATE_ERROR_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: '토큰의 사용자 ID에 해당하는 회원이 없음',
    examples: errorExamples({
      MEMBER_NOT_FOUND: '회원을 찾을 수 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '홈 화면 조회 중 서버 오류',
    examples: errorExamples({
      INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    }),
  })
  getHome(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HomeQueryDto,
  ) {
    return this.homeService.getHome(user.id, query.date);
  }

  @Get('summary')
  @ApiOperation({
    summary: '홈 날짜별 상태 요약 조회',
    description:
      'baseDate 앞뒤 30일(총 61일)의 날짜별 기록 상태만 반환합니다. 홈 캘린더 스트립/날짜 모달의 아이콘 표시용이며, 날짜 상세는 GET /calendar/daily를 사용합니다.',
  })
  @ApiSuccessResponse({
    type: HomeSummaryResponseDto,
    description: '홈 날짜별 상태 요약 조회 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'baseDate 형식 오류(YYYY-MM-DD가 아님)',
    examples: errorExamples(DATE_ERROR_EXAMPLES),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '날짜별 상태 요약 조회 중 서버 오류',
    examples: errorExamples({
      INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    }),
  })
  getDateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HomeSummaryQueryDto,
  ) {
    return this.homeService.getDateSummary(user.id, query.baseDate);
  }
}
