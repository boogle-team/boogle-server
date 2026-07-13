import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
// import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { Request, Response } from 'express';
import { GetWeeklyReportQueryDto } from './dto/get-weekly-report-query.dto';
import { WeeklyReportResponseDto } from './dto/weekly-report-response.dto';
import { GetMonthlyReportQueryDto } from './dto/get-monthly-report-query.dto';
import { MonthlyReportResponseDto } from './dto/monthly-report-response.dto';
import { CreatePdfReportRequestDto } from './dto/create-pdf-report-request.dto';
import { ReportService } from './report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('weekly')
  @ApiOperation({ summary: '주간 리포트 조회' })
  @ApiQuery({
    name: 'weekStartDate',
    required: false,
    description: '조회할 주 시작일. YYYY-MM-DD 형식. 없으면 현재 주 시작일',
    example: '2026-07-03',
  })
  @ApiQuery({
    name: 'includeGuide',
    required: false,
    description: '생활 가이드 포함 여부. 기본값 true',
    example: true,
  })
  // @ResponseMessage('주간 리포트 조회에 성공했습니다.')
  async getWeeklyReport(
    @Query() query: GetWeeklyReportQueryDto,
    @Req() req: Request,
  ): Promise<WeeklyReportResponseDto> {
    const userId = this.extractUserId(req);

    return this.reportService.getWeeklyReport(userId, query);
  }

  @Get('monthly')
  @ApiOperation({ summary: '월간 리포트 조회' })
  @ApiQuery({
    name: 'monthStartDate',
    required: false,
    description: '조회할 월 시작일. YYYY-MM-01 형식. 없으면 현재 월 시작일',
    example: '2026-07-01',
  })
  @ApiQuery({
    name: 'includePattern',
    required: false,
    description: '패턴 카드 포함 여부. 기본값 true',
    example: true,
  })
  // @ResponseMessage('월간 리포트 조회에 성공했습니다.')
  async getMonthlyReport(
    @Query() query: GetMonthlyReportQueryDto,
    @Req() req: Request,
  ): Promise<MonthlyReportResponseDto> {
    const userId = this.extractUserId(req);

    return this.reportService.getMonthlyReport(userId, query);
  }

  private extractUserId(req: Request): bigint {
    const userId = req.user?.id;

    if (userId === undefined) {
      throw new UnauthorizedException();
    }

    return userId;
  }

  @Post('pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PDF 리포트 저장' })
  @ApiProduces('application/pdf')
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
    description: 'PDF 파일',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async createPdfReport(
    @Body() body: CreatePdfReportRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userId = this.extractUserId(req);

    const { buffer, filename } = await this.reportService.createPdfReport(
      userId,
      body,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(HttpStatus.OK).send(buffer);
  }
}
