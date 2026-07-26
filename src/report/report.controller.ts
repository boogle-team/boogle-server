import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import type { Response } from 'express';
import {
  errorExample,
  errorExamples,
} from '@/common/swagger/error-example.util';
import { GetWeeklyReportQueryDto } from './dto/get-weekly-report-query.dto';
import { WeeklyReportResponseDto } from './dto/weekly-report-response.dto';
import { GetMonthlyReportQueryDto } from './dto/get-monthly-report-query.dto';
import { MonthlyReportResponseDto } from './dto/monthly-report-response.dto';
import { CreatePdfReportRequestDto } from './dto/create-pdf-report-request.dto';
import { ReportService } from './report.service';
import { ApiSuccessResponse } from '@/common/decorators/api-success-response.decorator';

const TOKEN_ERROR_EXAMPLES = {
  TOKEN_REQUIRED: 'token이 필요합니다.',
  TOKEN_INVALID: '유효하지 않은 token입니다.',
  TOKEN_EXPIRED: 'token이 만료되었습니다.',
};

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('weekly')
  @ApiOperation({
    summary: '주간 리포트 조회',
    description:
      '월요일부터 일요일까지의 주간 배변/생활 기록을 분석합니다. 통합 기록일이 3일 미만이면 dataStatus가 INSUFFICIENT이며 분석 결과와 패턴 가이드는 제한됩니다. includeGuide=false이면 패턴은 계산하지만 guides는 빈 배열로 반환합니다.',
  })
  @ResponseMessage('주간 리포트 조회에 성공했습니다.')
  @ApiSuccessResponse({
    type: WeeklyReportResponseDto,
    description: '주간 리포트 조회 성공',
    message: '주간 리포트 조회에 성공했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'weekStartDate 형식 오류, 월요일이 아닌 날짜 또는 includeGuide boolean 오류',
    examples: errorExamples({
      REPORT_INVALID_DATE_FORMAT:
        'weekStartDate는 YYYY-MM-DD 형식이어야 합니다.',
      REPORT_INVALID_DATE_RANGE: 'weekStartDate는 월요일이어야 합니다.',
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
    description: '주간 리포트 조회 중 서버 오류',
    examples: errorExamples({
      WEEKLY_REPORT_FETCH_FAILED: '주간 리포트 조회 중 오류가 발생했습니다.',
    }),
  })
  async getWeeklyReport(
    @Query() query: GetWeeklyReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WeeklyReportResponseDto> {
    const userId = BigInt(user.id);

    return this.reportService.getWeeklyReport(userId, query);
  }

  @Get('monthly')
  @ApiOperation({
    summary: '월간 리포트 조회',
    description:
      '선택 월의 배변/생활 기록을 분석합니다. 통합 기록일이 7일 미만이면 dataStatus가 INSUFFICIENT입니다. 기록이 충분하면 기록 완성도, 리듬 안정도, 상태 안정도, 사용자 유형, 이번 달 패턴과 개선점을 반환합니다. includePattern=false이면 patternCards는 빈 배열입니다.',
  })
  @ResponseMessage('월간 리포트 조회에 성공했습니다.')
  @ApiSuccessResponse({
    type: MonthlyReportResponseDto,
    description: '월간 리포트 조회 성공',
    message: '월간 리포트 조회에 성공했습니다.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'monthStartDate 형식 오류 또는 includePattern boolean 오류',
    examples: errorExamples({
      REPORT_INVALID_MONTH_FORMAT:
        'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
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
    description: '월간 리포트 조회 중 서버 오류',
    examples: errorExamples({
      MONTHLY_REPORT_FETCH_FAILED: '월간 리포트 조회 중 오류가 발생했습니다.',
    }),
  })
  async getMonthlyReport(
    @Query() query: GetMonthlyReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MonthlyReportResponseDto> {
    const userId = BigInt(user.id);

    return this.reportService.getMonthlyReport(userId, query);
  }

  @Post('pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PDF 리포트 생성 및 다운로드',
    description:
      '선택 기간의 리포트를 PDF로 생성합니다. 무료 사용자는 최대 31일, 구독 사용자는 최대 366일까지 요청할 수 있습니다. includeDailyRecords를 생략하면 true입니다.',
  })
  @ApiBody({
    type: CreatePdfReportRequestDto,
    examples: {
      default: {
        value: {
          startDate: '2026-07-01',
          endDate: '2026-07-31',
          includeDailyRecords: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: '생성된 PDF 파일',
    headers: {
      'Content-Disposition': {
        description: '다운로드 파일명',
        schema: {
          type: 'string',
          example: 'attachment; filename="boogle_report_20260701-20260731.pdf"',
        },
      },
    },
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      '날짜 형식 오류, 시작일/종료일 순서 오류, 최대 생성 기간 초과 또는 body 검증 오류',
    examples: {
      INVALID_START_DATE: {
        summary: 'startDate 형식 오류',
        value: errorExample(
          'REPORT_INVALID_DATE_FORMAT',
          'startDate는 YYYY-MM-DD 형식이어야 합니다.',
        ),
      },
      INVALID_END_DATE: {
        summary: 'endDate 형식 오류',
        value: errorExample(
          'REPORT_INVALID_DATE_FORMAT',
          'endDate는 YYYY-MM-DD 형식이어야 합니다.',
        ),
      },
      ...errorExamples({
        REPORT_INVALID_DATE_RANGE: 'startDate는 endDate보다 늦을 수 없습니다.',
        REPORT_PDF_RANGE_EXCEEDED: 'PDF 리포트 생성 가능 기간을 초과했습니다.',
        BAD_REQUEST: '요청 값이 올바르지 않습니다.',
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
    description: '해당 기간에 PDF로 생성할 데이터가 없음',
    examples: errorExamples({
      REPORT_DATA_NOT_FOUND: 'PDF로 생성할 리포트 데이터가 없습니다.',
    }),
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'PDF 생성 중 서버 오류',
    examples: errorExamples({
      REPORT_PDF_GENERATION_FAILED: 'PDF 리포트 생성 중 오류가 발생했습니다.',
    }),
  })
  async createPdfReport(
    @Body() body: CreatePdfReportRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const userId = BigInt(user.id);

    const { buffer, filename } = await this.reportService.createPdfReport(
      userId,
      body,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(HttpStatus.OK).send(buffer);
  }
}
