import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
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
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { CalendarDailyQueryDto } from './dto/calendar-daily-query.dto';
import { CalendarDailyResponseDto } from './dto/calendar-daily-response.dto';
import { CalendarService } from './calendar.service';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

const SERVER_ERROR_EXAMPLES = {
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
};

@ApiTags('캘린더')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({
    summary: '월간 캘린더 조회',
    description:
      '지정한 연·월의 1일~말일 날짜별 배변 상태와 월 요약 통계를 반환합니다. 날짜 판정은 KST 기준이며, 하루에 기록이 여러 건이면 배변 기록을 우선해 가장 최근 상태를 대표값으로 사용합니다.',
  })
  @ApiSuccessResponse({
    type: CalendarResponseDto,
    description: '월간 캘린더 조회 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'year/month 누락·형식 오류·범위(1~12) 초과',
    examples: errorExamples({
      BAD_REQUEST: '요청 값이 올바르지 않습니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '월간 캘린더 조회 중 서버 오류',
    examples: errorExamples(SERVER_ERROR_EXAMPLES),
  })
  getMonthlyCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getMonthlyCalendar(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get('daily')
  @ApiOperation({
    summary: '날짜 상세 조회',
    description:
      '선택한 날짜의 부글 기록 전체(하루 여러 건 가능)와 생활 기록 1건을 반환합니다. 생활 기록에는 태그·음식·약이 함께 포함됩니다. 부글 기록의 시각은 regDate가 아니라 bowelMovementAt을 사용합니다.',
  })
  @ApiSuccessResponse({
    type: CalendarDailyResponseDto,
    description: '날짜 상세 조회 성공',
    message: '요청이 성공적으로 처리되었습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'date 누락 또는 형식 오류(YYYY-MM-DD가 아님)',
    examples: errorExamples({
      BAD_REQUEST: '요청 값이 올바르지 않습니다.',
    }),
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'token 누락 또는 유효하지 않거나 만료된 token',
    examples: errorExamples(TOKEN_ERROR_EXAMPLES),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: '날짜 상세 조회 중 서버 오류',
    examples: errorExamples(SERVER_ERROR_EXAMPLES),
  })
  getDailyRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarDailyQueryDto,
  ) {
    return this.calendarService.getDailyRecords(user.id, query.date);
  }
}
