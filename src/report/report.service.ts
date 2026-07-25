import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import type { GetWeeklyReportQueryDto } from './dto/get-weekly-report-query.dto';
import type {
  BowelRhythmByDayDto,
  ChangeSummaryDto,
  FrequentTimeSlotDto,
  InsufficientNoticeDto,
  LifeFactorStatsDto,
  PreviousWeeklySummaryDto,
  ReportPeriodDto,
  StoolDistributionDto,
  WeeklyGuideDto,
  WeeklyRecordStatsDto,
  WeeklyReportResponseDto,
  WeeklySummaryDto,
} from './dto/weekly-report-response.dto';
import type { GetMonthlyReportQueryDto } from './dto/get-monthly-report-query.dto';
import type {
  MonthlyChangeSummaryDto,
  MonthlyLifeFactorStatsDto,
  MonthlyPdfDto,
  MonthlyRecordStatsDto,
  MonthlyReportPeriodDto,
  MonthlyReportResponseDto,
  MonthlyStoolDistributionDto,
  MonthlySummaryDto,
  MonthlyUserTypeDto,
  PreviousMonthlySummaryDto,
  WeeklyTrendDto,
} from './dto/monthly-report-response.dto';
import { CreatePdfReportRequestDto } from './dto/create-pdf-report-request.dto';
import type {
  BoogleRecordForReport,
  LifeRecordForReport,
  WeeklyPatternContext,
  WeeklyRecordForReport,
  WeeklyRecordForTrend,
} from './dto/report-record.dto';
import { detectWeeklyPatterns } from './pattern/weekly-pattern.detector';
import {
  PATTERN_GUIDE_BINDINGS,
  type PatternGuideBinding,
  type WeeklyRuleCode,
} from './pattern/weekly-pattern.constants';
import {
  buildMonthlyImprovements,
  buildMonthlyPatternCards,
  calculateMonthlyPatternMetrics,
} from './pattern/monthly-pattern.calculator';
import { ReportErrorCode } from './report-error-code.enum';
import type {
  PdfReportResult,
  MemberForPdf,
  BoogleRecordForPdf,
  LifeRecordForPdf,
  WeeklyRecordForPdf,
  MonthlyRecordForPdf,
  GuideContentForPdf,
  PdfReportBuildData,
} from './dto/pdf-report-data.dto';
import {
  calculateMonthlyScores,
  calculateReportScores,
} from './score/report-score.calculator';
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';

const TOTAL_WEEK_DAYS = 7;
const REQUIRED_RECORDED_DAYS = 3;

const MONTHLY_PDF_ENDPOINT = '/api/v1/reports/pdf';

const FREE_PDF_MAX_DAYS = 31;
const PREMIUM_PDF_MAX_DAYS = 366;

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}
  // 주간 메인
  async getWeeklyReport(
    userId: bigint,
    query: GetWeeklyReportQueryDto,
  ): Promise<WeeklyReportResponseDto> {
    try {
      const includeGuide = query.includeGuide ?? true;
      const weekStartDate = this.resolveWeekStartDate(query.weekStartDate);
      const weekEndDate = this.addDays(weekStartDate, 6);
      const nextWeekStartDate = this.addDays(weekStartDate, 7);

      const previousWeekStartDate = this.addDays(weekStartDate, -7);
      const previousWeekEndDate = this.addDays(weekStartDate, -1);

      // 현재 주 일요일을 끝으로 하는 최근 30일
      const lookback30StartDate = this.addDays(nextWeekStartDate, -30);

      const [
        weeklyRecord,
        previousWeeklyRecord,
        boogleHistory,
        lifeHistory,
        patternContext,
      ] = await Promise.all([
        this.findWeeklyRecord(userId, weekStartDate),
        this.findWeeklyRecord(userId, previousWeekStartDate),
        this.findBoogleRecords(userId, lookback30StartDate, nextWeekStartDate),
        this.findLifeRecords(userId, lookback30StartDate, nextWeekStartDate),
        this.findWeeklyPatternContext(userId, weekStartDate),
      ]);

      const boogleRecords = boogleHistory.filter(
        (record) =>
          record.regDate >= weekStartDate && record.regDate < nextWeekStartDate,
      );
      const lifeRecords = lifeHistory.filter(
        (record) =>
          record.regDate >= weekStartDate && record.regDate < nextWeekStartDate,
      );
      const previousBoogleRecords = boogleHistory.filter(
        (record) =>
          record.regDate >= previousWeekStartDate &&
          record.regDate < weekStartDate,
      );
      const previousLifeRecords = lifeHistory.filter(
        (record) =>
          record.regDate >= previousWeekStartDate &&
          record.regDate < weekStartDate,
      );

      const recordStats = this.buildRecordStats(boogleRecords, lifeRecords);
      const previousRecordStats = this.buildRecordStats(
        previousBoogleRecords,
        previousLifeRecords,
      );

      const previousSummary = this.buildPreviousSummary(
        previousWeekStartDate,
        previousWeekEndDate,
        previousWeeklyRecord,
        previousBoogleRecords,
        previousRecordStats,
      );

      const period = this.buildPeriod(weekStartDate, weekEndDate);

      if (recordStats.recordedDays < REQUIRED_RECORDED_DAYS) {
        return this.buildInsufficientResponse(
          period,
          recordStats,
          previousSummary,
        );
      }

      const summary = this.buildSummary(
        weeklyRecord,
        boogleRecords,
        recordStats,
      );
      const stoolDistribution = this.buildStoolDistribution(boogleRecords);
      const lifeFactorStats = this.buildLifeFactorStats(lifeRecords);

      const detectedRules = detectWeeklyPatterns({
        weekStartDate,
        weekEndDateExclusive: nextWeekStartDate,
        boogleRecords: boogleHistory,
        lifeRecords: lifeHistory,
        context: patternContext,
      });

      const guides = await this.findGuidesByRules(
        userId,
        detectedRules.map((rule) => rule.ruleCode),
        includeGuide,
      );

      const guideByRuleCode = new Map(
        guides.flatMap((guide) =>
          guide.matchedRuleCodes.map((ruleCode) => [ruleCode, guide] as const),
        ),
      );

      const patternCards = detectedRules.map(({ ruleCode, card }) => {
        const guide = guideByRuleCode.get(ruleCode);

        return {
          ...card,
          guideId: guide?.guideId ?? null,
          description:
            guide?.summary ??
            card.description ??
            '기록에서 해당 패턴이 감지됐어요.',
        };
      });

      return {
        period,
        dataStatus: 'ENOUGH',
        summary,
        recordStats,
        previousSummary,
        changeSummary:
          previousSummary === null
            ? null
            : this.buildChangeSummary(summary, previousSummary),
        stoolDistribution,
        bowelRhythmByDay: this.buildBowelRhythmByDay(
          boogleRecords,
          weekStartDate,
        ),
        frequentTimeSlots: this.buildFrequentTimeSlots(boogleRecords),
        lifeFactorStats,
        patternCards,
        guides,
        insufficientNotice: null,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw new BusinessException(
        ReportErrorCode.WEEKLY_REPORT_FETCH_FAILED,
        '주간 리포트 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // 월간 메인
  async getMonthlyReport(
    userId: bigint,
    query: GetMonthlyReportQueryDto,
  ): Promise<MonthlyReportResponseDto> {
    try {
      const includePattern = query.includePattern ?? true;
      const monthStartDate = this.resolveMonthStartDate(query.monthStartDate);
      const calendarNextMonthStart = this.addMonths(monthStartDate, 1);
      const calendarMonthEnd = this.addDays(calendarNextMonthStart, -1);

      const today = this.getTodayUtc();
      const effectiveMonthEnd =
        monthStartDate <= today && today <= calendarMonthEnd
          ? today
          : calendarMonthEnd;
      const effectiveEndExclusive = this.addDays(effectiveMonthEnd, 1);

      const previousMonthStartDate = this.addMonths(monthStartDate, -1);
      const previousMonthEndDate = this.addDays(monthStartDate, -1);

      const [
        boogleRecords,
        lifeRecords,
        previousBoogleRecords,
        previousLifeRecords,
        weeklyRecords,
      ] = await Promise.all([
        this.findBoogleRecords(userId, monthStartDate, effectiveEndExclusive),
        this.findLifeRecords(userId, monthStartDate, effectiveEndExclusive),
        this.findBoogleRecords(userId, previousMonthStartDate, monthStartDate),
        this.findLifeRecords(userId, previousMonthStartDate, monthStartDate),
        this.findWeeklyRecordsForMonth(
          userId,
          monthStartDate,
          calendarNextMonthStart,
        ),
      ]);

      const recordStats = this.buildMonthlyRecordStats(
        boogleRecords,
        lifeRecords,
        calendarMonthEnd.getUTCDate(),
      );
      const previousRecordStats = this.buildMonthlyRecordStats(
        previousBoogleRecords,
        previousLifeRecords,
        previousMonthEndDate.getUTCDate(),
      );
      const period = this.buildMonthlyPeriod(monthStartDate, effectiveMonthEnd);
      const pdf = this.buildMonthlyPdf();

      if (recordStats.recordedDays < 7) {
        return {
          period,
          dataStatus: 'INSUFFICIENT',
          summary: null,
          recordStats,
          previousSummary: null,
          changeSummary: null,
          stoolDistribution: [],
          weeklyTrend: [],
          lifeFactorStats: null,
          userType: null,
          patternCards: [],
          improvements: [],
          pdf,
          notice: {
            code: 'MONTHLY_RECORD_NOT_ENOUGH',
            message:
              `현재 ${recordStats.recordedDays}일째 기록 중이에요. ` +
              '7일 이상 기록하면 월간 리포트를 볼 수 있어요.',
          },
        };
      }

      const summary = this.buildMonthlySummary(
        boogleRecords,
        lifeRecords,
        recordStats,
      );
      const previousSummary =
        previousRecordStats.recordedDays < 7
          ? null
          : this.buildPreviousMonthlySummaryFromRaw(
              previousBoogleRecords,
              previousLifeRecords,
              previousRecordStats,
              previousMonthStartDate,
              previousMonthEndDate,
            );

      const currentMetrics = calculateMonthlyPatternMetrics(
        boogleRecords,
        lifeRecords,
      );
      const previousMetrics =
        previousSummary === null
          ? null
          : calculateMonthlyPatternMetrics(
              previousBoogleRecords,
              previousLifeRecords,
            );

      const patternCards = includePattern
        ? buildMonthlyPatternCards(currentMetrics)
        : [];
      const improvements = buildMonthlyImprovements(
        currentMetrics,
        previousMetrics,
        summary.conditionScore,
        previousSummary?.conditionScore ?? null,
      );

      const stoolDistribution =
        this.buildMonthlyStoolDistribution(boogleRecords);
      const lifeFactorStats = this.buildMonthlyLifeFactorStats(lifeRecords);

      return {
        period,
        dataStatus: 'ENOUGH',
        summary,
        recordStats,
        previousSummary,
        changeSummary:
          previousSummary === null
            ? null
            : this.buildMonthlyChangeSummary(summary, previousSummary),
        stoolDistribution,
        weeklyTrend: this.buildWeeklyTrend(
          weeklyRecords,
          boogleRecords,
          lifeRecords,
          monthStartDate,
          effectiveMonthEnd,
        ),
        lifeFactorStats,
        userType: this.resolveMonthlyUserType(
          recordStats,
          boogleRecords,
          lifeRecords,
        ),
        patternCards,
        improvements,
        pdf,
        notice: null,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw new BusinessException(
        ReportErrorCode.MONTHLY_REPORT_FETCH_FAILED,
        '월간 리포트 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getTodayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private buildPreviousMonthlySummaryFromRaw(
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
    recordStats: MonthlyRecordStatsDto,
    monthStartDate: Date,
    monthEndDate: Date,
  ): PreviousMonthlySummaryDto {
    const summary = this.buildMonthlySummary(
      boogleRecords,
      lifeRecords,
      recordStats,
    );
    const userType = this.resolveMonthlyUserType(
      recordStats,
      boogleRecords,
      lifeRecords,
    );

    return {
      period: this.buildMonthlyPeriod(monthStartDate, monthEndDate),
      ...summary,
      userType: userType.code,
      userTypeLabel: userType.name,
    };
  }
  // PDF 메인
  async createPdfReport(
    userId: bigint,
    body: CreatePdfReportRequestDto,
  ): Promise<PdfReportResult> {
    try {
      const includeDailyRecords = body.includeDailyRecords ?? true;

      const startDate = this.parseRequiredDate(body.startDate, 'startDate');
      const endDate = this.parseRequiredDate(body.endDate, 'endDate');
      const endDateExclusive = this.addDays(endDate, 1);

      if (startDate > endDate) {
        throw new BusinessException(
          ReportErrorCode.REPORT_INVALID_DATE_RANGE,
          'startDate는 endDate보다 늦을 수 없습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const member = await this.findMemberForPdf(userId);

      if (member === null) {
        throw new BusinessException(
          ReportErrorCode.REPORT_DATA_NOT_FOUND,
          'PDF로 생성할 리포트 데이터가 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      this.assertPdfRangeAllowed(startDate, endDate, member);

      const [boogleRecords, lifeRecords, weeklyRecords, monthlyRecords] =
        await Promise.all([
          this.findBoogleRecordsForPdf(userId, startDate, endDateExclusive),
          this.findLifeRecordsForPdf(userId, startDate, endDateExclusive),
          this.findWeeklyRecordsForPdf(userId, startDate, endDate),
          this.findMonthlyRecordsForPdf(userId, startDate, endDate),
        ]);

      const hasReportData =
        boogleRecords.length > 0 ||
        lifeRecords.length > 0 ||
        weeklyRecords.length > 0 ||
        monthlyRecords.length > 0;

      if (!hasReportData) {
        throw new BusinessException(
          ReportErrorCode.REPORT_DATA_NOT_FOUND,
          'PDF로 생성할 리포트 데이터가 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const ruleCodes = this.detectPdfRuleCodes(
        boogleRecords,
        lifeRecords,
        weeklyRecords,
        monthlyRecords,
      );

      const guides = await this.findGuideContentsForPdf(ruleCodes);

      const buffer = await this.buildPdfReportBuffer({
        member,
        startDate,
        endDate,
        includeDailyRecords,
        boogleRecords,
        lifeRecords,
        weeklyRecords,
        monthlyRecords,
        guides,
      });

      return {
        buffer,
        filename: this.buildPdfFilename(startDate, endDate),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw new BusinessException(
        ReportErrorCode.REPORT_PDF_GENERATION_FAILED,
        'PDF 리포트 생성 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // 주간기록 조회
  private async findWeeklyRecord(
    userId: bigint,
    weekStartDate: Date,
  ): Promise<WeeklyRecordForReport | null> {
    return this.prisma.weeklyRecord.findFirst({
      where: {
        userId,
        weekStartDate,
      },
      select: {
        bowelCount: true,
        intervalAvg: true,
        completionScore: true,
      },
    });
  }
  // 부글기록 조회
  private async findBoogleRecords(
    userId: bigint,
    startDate: Date,
    endDateExclusive: Date,
  ): Promise<BoogleRecordForReport[]> {
    return this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: startDate,
          lt: endDateExclusive,
        },
      },
      select: {
        id: true,
        regDate: true,
        hasBowel: true,
        stoolBristol: true,
        stoolSimple: true,
        bowelFeeling: true,
        stomach: true,
        distension: true,
        remainingFeeling: true,
        urgency: true,
        takenTime: true,
        amount: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }
  // 생활기록 조회
  private async findLifeRecords(
    userId: bigint,
    startDate: Date,
    endDateExclusive: Date,
  ): Promise<LifeRecordForReport[]> {
    return this.prisma.lifeRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: startDate,
          lt: endDateExclusive,
        },
      },
      select: {
        id: true,
        regDate: true,
        sleep: true,
        sleepTime: true,
        caffeine: true,
        exercise: true,
        stress: true,
        water: true,
        waterIntake: true,
        mealRegular: true,
        hormone: true,
        foodTags: {
          select: {
            food: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }
  // 이전 월 기록 , 민감정보 동의 내역 조회
  private async findWeeklyPatternContext(
    userId: bigint,
    weekStartDate: Date,
  ): Promise<WeeklyPatternContext> {
    const currentMonthStart = new Date(
      Date.UTC(weekStartDate.getUTCFullYear(), weekStartDate.getUTCMonth(), 1),
    );
    const previousMonthStart = this.addMonths(currentMonthStart, -1);

    const [member, previousMonthlyRecord] = await Promise.all([
      this.prisma.member.findUnique({
        where: {
          id: userId,
        },
        select: {
          sensInfo: true,
        },
      }),
      this.prisma.monthlyRecord.findFirst({
        where: {
          userId,
          monthStartDate: previousMonthStart,
        },
        select: {
          userType: true,
        },
      }),
    ]);

    return {
      previousMonthlyUserType: previousMonthlyRecord?.userType ?? null,
      sensitiveInfoAgreed: member?.sensInfo === 'Y',
    };
  }

  private async findGuidesByRules(
    userId: bigint,
    ruleCodes: WeeklyRuleCode[],
    includeGuide: boolean,
  ): Promise<WeeklyGuideDto[]> {
    if (!includeGuide || ruleCodes.length === 0) {
      return [];
    }

    const detectedRuleCodeSet = new Set<WeeklyRuleCode>(ruleCodes);

    const matchedBindings = PATTERN_GUIDE_BINDINGS.filter((binding) =>
      binding.ruleCodes.some((ruleCode) => detectedRuleCodeSet.has(ruleCode)),
    );

    if (matchedBindings.length === 0) {
      return [];
    }

    const guides = await this.prisma.guide.findMany({
      where: {
        category: 'P',
        status: 'A',
        title: {
          in: matchedBindings.map((binding) => binding.guideTitle),
        },
      },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const feedbacks = await this.prisma.guideFeedback.findMany({
      where: {
        userId,
        guideId: {
          in: guides.map((guide) => guide.id),
        },
      },
      select: {
        guideId: true,
        feedback: true,
      },
    });

    const feedbackMap = new Map(
      feedbacks.map((feedback) => [feedback.guideId, feedback.feedback]),
    );
    const bindingMap = new Map<string, PatternGuideBinding>(
      matchedBindings.map((binding) => [binding.guideTitle, binding]),
    );

    return guides.flatMap((guide): WeeklyGuideDto[] => {
      const binding = bindingMap.get(guide.title);

      if (binding === undefined) {
        return [];
      }

      const matchedRuleCodes = binding.ruleCodes.filter((ruleCode) =>
        detectedRuleCodeSet.has(ruleCode),
      );

      return [
        {
          guideId: guide.id,
          category: 'P',
          title: guide.title,
          summary: guide.summary,
          matchedRuleCodes,
          feedbackStatus: feedbackMap.get(guide.id) ?? null,
        },
      ];
    });
  }

  // 주간시작일자
  private resolveWeekStartDate(weekStartDate?: string): Date {
    if (weekStartDate === undefined || weekStartDate.trim() === '') {
      return this.getCurrentMonday();
    }

    const parsedDate = this.parseDateString(weekStartDate);

    if (parsedDate === null) {
      throw new BusinessException(
        ReportErrorCode.REPORT_INVALID_DATE_FORMAT,
        'weekStartDate는 YYYY-MM-DD 형식이어야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
  }
  // 월간시작일자
  private resolveMonthStartDate(monthStartDate?: string): Date {
    if (monthStartDate === undefined || monthStartDate.trim() === '') {
      const now = new Date();

      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    }

    const parsedDate = this.parseDateString(monthStartDate);

    if (parsedDate === null || parsedDate.getUTCDate() !== 1) {
      throw new BusinessException(
        ReportErrorCode.REPORT_INVALID_MONTH_FORMAT,
        'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
  }
  // 주간 함수 시작
  private parseDateString(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match === null) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    const isValidDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    return isValidDate ? date : null;
  }

  private getCurrentMonday(): Date {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    const dayOfWeek = today.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    return this.addDays(today, diff);
  }

  private addDays(date: Date, days: number): Date {
    const copiedDate = new Date(date);
    copiedDate.setUTCDate(copiedDate.getUTCDate() + days);
    return copiedDate;
  }

  private buildPeriod(startDate: Date, endDate: Date): ReportPeriodDto {
    return {
      type: 'WEEKLY',
      startDate: this.toDateString(startDate),
      endDate: this.toDateString(endDate),
    };
  }

  private buildRecordStats(
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
  ): WeeklyRecordStatsDto {
    const boogleRecordDateSet = new Set(
      boogleRecords.map((record) => this.toDateString(record.regDate)),
    );
    const lifeRecordDateSet = new Set(
      lifeRecords.map((record) => this.toDateString(record.regDate)),
    );
    const recordedDateSet = new Set([
      ...boogleRecordDateSet,
      ...lifeRecordDateSet,
    ]);

    const completionScore = this.round1(
      Math.min((recordedDateSet.size / 7) * 100, 100),
    );

    return {
      totalDays: 7,
      recordedDays: recordedDateSet.size,
      boogleRecordDays: boogleRecordDateSet.size,
      lifeRecordDays: lifeRecordDateSet.size,
      requiredDays: 3,
      completionScore,
    };
  }

  private buildSummary(
    weeklyRecord: WeeklyRecordForReport | null,
    boogleRecords: BoogleRecordForReport[],
    recordStats: WeeklyRecordStatsDto,
  ): WeeklySummaryDto {
    const calculatedBowelCount = boogleRecords.filter(
      (record) => record.hasBowel,
    ).length;

    const bowelCount = weeklyRecord?.bowelCount ?? calculatedBowelCount;

    return {
      bowelCount,
      intervalAvg:
        weeklyRecord?.intervalAvg ??
        (bowelCount === 0 ? 0 : this.round1(TOTAL_WEEK_DAYS / bowelCount)),
      completionScore: recordStats.completionScore,
    };
  }

  private buildPreviousSummary(
    previousWeekStartDate: Date,
    previousWeekEndDate: Date,
    previousWeeklyRecord: WeeklyRecordForReport | null,
    previousBoogleRecords: BoogleRecordForReport[],
    previousRecordStats: WeeklyRecordStatsDto,
  ): PreviousWeeklySummaryDto | null {
    if (
      previousWeeklyRecord === null &&
      previousRecordStats.recordedDays === 0
    ) {
      return null;
    }

    const summary = this.buildSummary(
      previousWeeklyRecord,
      previousBoogleRecords,
      previousRecordStats,
    );

    return {
      period: this.buildPeriod(previousWeekStartDate, previousWeekEndDate),
      ...summary,
    };
  }

  private buildChangeSummary(
    current: WeeklySummaryDto,
    previous: PreviousWeeklySummaryDto,
  ): ChangeSummaryDto {
    const bowelCountDiff = current.bowelCount - previous.bowelCount;
    const intervalAvgDiff = this.round1(
      current.intervalAvg - previous.intervalAvg,
    );
    const completionScoreDiff = this.round1(
      current.completionScore - previous.completionScore,
    );

    return {
      compareType: 'PREVIOUS_WEEK',
      bowelCountDiff,
      bowelCountChangeRate:
        previous.bowelCount === 0
          ? null
          : this.round1((bowelCountDiff / previous.bowelCount) * 100),
      intervalAvgDiff,
      completionScoreDiff,
      trend: this.resolveTrend(bowelCountDiff),
      description: this.buildChangeDescription(
        bowelCountDiff,
        completionScoreDiff,
      ),
    };
  }

  private resolveTrend(bowelCountDiff: number): ChangeSummaryDto['trend'] {
    if (bowelCountDiff > 0) return 'INCREASE';
    if (bowelCountDiff < 0) return 'DECREASE';
    return 'SAME';
  }

  private buildChangeDescription(
    bowelCountDiff: number,
    completionScoreDiff: number,
  ): string {
    const bowelText =
      bowelCountDiff > 0
        ? `지난주보다 배변 횟수가 ${bowelCountDiff}회 증가했고`
        : bowelCountDiff < 0
          ? `지난주보다 배변 횟수가 ${Math.abs(bowelCountDiff)}회 감소했고`
          : '지난주와 배변 횟수가 같고';

    const completionText =
      completionScoreDiff > 0
        ? `기록 완성도는 ${completionScoreDiff}점 높아졌어요.`
        : completionScoreDiff < 0
          ? `기록 완성도는 ${Math.abs(completionScoreDiff)}점 낮아졌어요.`
          : '기록 완성도는 같아요.';

    return `${bowelText}, ${completionText}`;
  }

  private buildStoolDistribution(
    boogleRecords: BoogleRecordForReport[],
  ): StoolDistributionDto[] {
    const stoolMap = {
      H: { label: '딱딱함', count: 0 },
      M: { label: '보통', count: 0 },
      T: { label: '묽음', count: 0 },
    };

    for (const record of boogleRecords) {
      if (!record.hasBowel) continue;
      if (
        record.stoolSimple !== 'H' &&
        record.stoolSimple !== 'M' &&
        record.stoolSimple !== 'T'
      ) {
        continue;
      }

      stoolMap[record.stoolSimple].count += 1;
    }

    const total = Object.values(stoolMap).reduce(
      (sum, item) => sum + item.count,
      0,
    );

    return (Object.keys(stoolMap) as Array<'H' | 'M' | 'T'>).map((key) => ({
      stoolSimple: key,
      label: stoolMap[key].label,
      count: stoolMap[key].count,
      ratio: total === 0 ? 0 : this.round1((stoolMap[key].count / total) * 100),
    }));
  }

  private buildBowelRhythmByDay(
    boogleRecords: BoogleRecordForReport[],
    weekStartDate: Date,
  ): BowelRhythmByDayDto[] {
    const dayMeta = [
      { dayOfWeek: 'MON', label: '월' },
      { dayOfWeek: 'TUE', label: '화' },
      { dayOfWeek: 'WED', label: '수' },
      { dayOfWeek: 'THU', label: '목' },
      { dayOfWeek: 'FRI', label: '금' },
      { dayOfWeek: 'SAT', label: '토' },
      { dayOfWeek: 'SUN', label: '일' },
    ] as const;

    return dayMeta
      .map((meta, index) => {
        const targetDate = this.toDateString(
          this.addDays(weekStartDate, index),
        );
        const bowelCount = boogleRecords.filter(
          (record) =>
            record.hasBowel && this.toDateString(record.regDate) === targetDate,
        ).length;

        return {
          dayOfWeek: meta.dayOfWeek,
          label: meta.label,
          bowelCount,
        };
      })
      .filter((item) => item.bowelCount > 0);
  }

  private buildFrequentTimeSlots(
    boogleRecords: BoogleRecordForReport[],
  ): FrequentTimeSlotDto[] {
    const slotMap: Record<
      FrequentTimeSlotDto['timeSlot'],
      { label: string; count: number }
    > = {
      MORNING: { label: '아침', count: 0 },
      AFTERNOON: { label: '오후', count: 0 },
      EVENING: { label: '저녁', count: 0 },
      NIGHT: { label: '밤', count: 0 },
    };

    for (const record of boogleRecords) {
      if (!record.hasBowel) continue;

      const slot = this.resolveTimeSlot(record.regDate);
      slotMap[slot].count += 1;
    }

    return (Object.keys(slotMap) as FrequentTimeSlotDto['timeSlot'][])
      .map((timeSlot) => ({
        timeSlot,
        label: slotMap[timeSlot].label,
        count: slotMap[timeSlot].count,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  private resolveTimeSlot(date: Date): FrequentTimeSlotDto['timeSlot'] {
    const hour = date.getUTCHours();

    if (hour >= 5 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 18) return 'AFTERNOON';
    if (hour >= 18 && hour < 23) return 'EVENING';
    return 'NIGHT';
  }

  private buildLifeFactorStats(
    lifeRecords: LifeRecordForReport[],
  ): LifeFactorStatsDto {
    return {
      lowSleep: {
        sourceField: 'sleepTime',
        condition: 'sleepTime = 1',
        label: '수면 부족',
        count: lifeRecords.filter((record) => record.sleepTime === 1).length,
      },
      highCaffeine: {
        sourceField: 'caffeine',
        condition: 'caffeine = M',
        label: '카페인 2잔 이상',
        count: lifeRecords.filter((record) => record.caffeine === 'M').length,
      },
      noExercise: {
        sourceField: 'exercise',
        condition: 'exercise = N',
        label: '운동 안 함',
        count: lifeRecords.filter((record) => record.exercise === 'N').length,
      },
      highStress: {
        sourceField: 'stress',
        condition: 'stress = H',
        label: '스트레스 높음',
        count: lifeRecords.filter((record) => record.stress === 'H').length,
      },
      lowWater: {
        sourceField: 'water',
        condition: 'water = L',
        label: '수분 부족',
        count: lifeRecords.filter((record) => record.water === 'L').length,
      },
    };
  }

  private buildInsufficientResponse(
    period: ReportPeriodDto,
    recordStats: WeeklyRecordStatsDto,
    previousSummary: PreviousWeeklySummaryDto | null,
  ): WeeklyReportResponseDto {
    const insufficientNotice: InsufficientNoticeDto = {
      code: 'WEEKLY_RECORD_NOT_ENOUGH',
      message:
        '아직 분석할 기록이 부족해요. 3일 이상 기록하면 패턴을 확인할 수 있어요!',
    };

    return {
      period,
      dataStatus: 'INSUFFICIENT',
      summary: null,
      recordStats,
      previousSummary,
      changeSummary: null,
      stoolDistribution: [],
      bowelRhythmByDay: [],
      frequentTimeSlots: [],
      lifeFactorStats: null,
      patternCards: [],
      guides: [],
      insufficientNotice,
    };
  }
  // 월간 함수 시작
  private addMonths(date: Date, months: number): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
    );
  }

  private buildMonthlyPeriod(
    startDate: Date,
    endDate: Date,
  ): MonthlyReportPeriodDto {
    return {
      type: 'MONTHLY',
      startDate: this.toDateString(startDate),
      endDate: this.toDateString(endDate),
    };
  }

  private buildMonthlyRecordStats(
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
    calendarDays: number,
  ): MonthlyRecordStatsDto {
    const boogleRecordDateSet = new Set(
      boogleRecords.map((record) => this.toDateString(record.regDate)),
    );
    const lifeRecordDateSet = new Set(
      lifeRecords.map((record) => this.toDateString(record.regDate)),
    );
    const recordedDateSet = new Set([
      ...boogleRecordDateSet,
      ...lifeRecordDateSet,
    ]);
    const completionScore = this.round1(
      Math.min((recordedDateSet.size / 30) * 100, 100),
    );

    return {
      totalDays: 30,
      calendarDays,
      recordedDays: recordedDateSet.size,
      boogleRecordDays: boogleRecordDateSet.size,
      lifeRecordDays: lifeRecordDateSet.size,
      requiredDays: 7,
      completionScore,
    };
  }

  private async findWeeklyRecordsForMonth(
    userId: bigint,
    monthStartDate: Date,
    nextMonthStartDate: Date,
  ): Promise<WeeklyRecordForTrend[]> {
    return this.prisma.weeklyRecord.findMany({
      where: {
        userId,
        weekStartDate: {
          gte: monthStartDate,
          lt: nextMonthStartDate,
        },
      },
      select: {
        weekStartDate: true,
        bowelCount: true,
        completionScore: true,
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });
  }

  private buildMonthlySummary(
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
    recordStats: MonthlyRecordStatsDto,
  ): MonthlySummaryDto {
    const bowelRecords = boogleRecords.filter((record) => record.hasBowel);
    const bowelDays = new Set(
      bowelRecords.map((record) => this.toDateString(record.regDate)),
    ).size;
    const scores = calculateMonthlyScores(boogleRecords, lifeRecords);
    const state = this.resolveMonthlyState(scores.conditionScore);

    return {
      bowelCount: bowelRecords.length,
      bowelDays,
      intervalAvg: bowelDays === 0 ? 0 : this.round1(30 / bowelDays),
      completionScore: recordStats.completionScore,
      rhythmScore: scores.rhythmScore,
      stateScore: scores.stateScore,
      conditionScore: scores.conditionScore,
      state,
      stateLabel: this.getStateLabel(state),
    };
  }

  private buildMonthlyChangeSummary(
    current: MonthlySummaryDto,
    previous: PreviousMonthlySummaryDto | null,
  ): MonthlyChangeSummaryDto {
    if (previous === null) {
      return {
        compareType: 'PREVIOUS_MONTH',
        compareAvailable: false,
        reasonCode: 'PREVIOUS_MONTH_NOT_FOUND',
        bowelCountDiff: null,
        bowelCountChangeRate: null,
        intervalAvgDiff: null,
        completionScoreDiff: null,
        conditionScoreDiff: null,
        trend: 'NO_PREVIOUS_DATA',
        description: '비교할 지난달 기록이 아직 없어요.',
      };
    }

    const bowelCountDiff = current.bowelCount - previous.bowelCount;
    const conditionScoreDiff =
      current.conditionScore === null || previous.conditionScore === null
        ? null
        : current.conditionScore - previous.conditionScore;

    return {
      compareType: 'PREVIOUS_MONTH',
      compareAvailable: true,
      bowelCountDiff,
      bowelCountChangeRate:
        previous.bowelCount === 0
          ? null
          : this.round1((bowelCountDiff / previous.bowelCount) * 100),
      intervalAvgDiff: this.round1(current.intervalAvg - previous.intervalAvg),
      completionScoreDiff: this.round1(
        current.completionScore - previous.completionScore,
      ),
      conditionScoreDiff,
      trend: this.resolveMonthlyTrend(conditionScoreDiff, bowelCountDiff),
      description: this.buildMonthlyChangeDescription(
        bowelCountDiff,
        conditionScoreDiff,
      ),
    };
  }

  private resolveMonthlyTrend(
    conditionScoreDiff: number | null,
    bowelCountDiff: number,
  ): MonthlyChangeSummaryDto['trend'] {
    if (conditionScoreDiff !== null) {
      if (conditionScoreDiff > 0) return 'IMPROVED';
      if (conditionScoreDiff < 0) return 'WORSENED';
    }

    if (bowelCountDiff > 0) return 'INCREASE';
    if (bowelCountDiff < 0) return 'DECREASE';
    return 'SAME';
  }

  private buildMonthlyChangeDescription(
    bowelCountDiff: number,
    conditionScoreDiff: number | null,
  ): string {
    const bowelText =
      bowelCountDiff > 0
        ? `지난달보다 배변 횟수는 ${bowelCountDiff}회 증가했고`
        : bowelCountDiff < 0
          ? `지난달보다 배변 횟수는 ${Math.abs(bowelCountDiff)}회 감소했고`
          : '지난달과 배변 횟수는 같고';

    if (conditionScoreDiff === null) {
      return `${bowelText}, 장 컨디션 점수는 비교하기 어려워요.`;
    }

    const conditionText =
      conditionScoreDiff > 0
        ? `장 컨디션 점수는 ${conditionScoreDiff}점 높아졌어요.`
        : conditionScoreDiff < 0
          ? `장 컨디션 점수는 ${Math.abs(conditionScoreDiff)}점 낮아졌어요.`
          : '장 컨디션 점수는 같아요.';

    return `${bowelText}, ${conditionText}`;
  }

  private buildMonthlyStoolDistribution(
    boogleRecords: BoogleRecordForReport[],
  ): MonthlyStoolDistributionDto[] {
    const stoolMap = {
      H: { label: '딱딱함', count: 0 },
      M: { label: '보통', count: 0 },
      T: { label: '묽음', count: 0 },
    };

    for (const record of boogleRecords) {
      if (!record.hasBowel) continue;

      if (
        record.stoolSimple !== 'H' &&
        record.stoolSimple !== 'M' &&
        record.stoolSimple !== 'T'
      ) {
        continue;
      }

      stoolMap[record.stoolSimple].count += 1;
    }

    const total = Object.values(stoolMap).reduce(
      (sum, item) => sum + item.count,
      0,
    );

    return (Object.keys(stoolMap) as Array<'H' | 'M' | 'T'>).map((key) => ({
      stoolSimple: key,
      label: stoolMap[key].label,
      count: stoolMap[key].count,
      ratio: total === 0 ? 0 : this.round1((stoolMap[key].count / total) * 100),
    }));
  }

  private buildWeeklyTrend(
    weeklyRecords: WeeklyRecordForTrend[],
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
    monthStartDate: Date,
    monthEndDate: Date,
  ): WeeklyTrendDto[] {
    const weeklyRecordMap = new Map(
      weeklyRecords.map((record) => [
        this.toDateString(record.weekStartDate),
        record,
      ]),
    );

    const weeklyTrend: WeeklyTrendDto[] = [];
    let weekStartDate = monthStartDate;
    let weekIndex = 1;

    while (weekStartDate <= monthEndDate) {
      const weekEndDate = this.minDate(
        this.addDays(weekStartDate, 6),
        monthEndDate,
      );
      const nextWeekEndDate = this.addDays(weekEndDate, 1);

      const weekKey = this.toDateString(weekStartDate);
      const weeklyRecord = weeklyRecordMap.get(weekKey);

      const weekBoogleRecords = boogleRecords.filter(
        (record) =>
          record.regDate >= weekStartDate && record.regDate < nextWeekEndDate,
      );
      const weekLifeRecords = lifeRecords.filter(
        (record) =>
          record.regDate >= weekStartDate && record.regDate < nextWeekEndDate,
      );

      const trendPeriodDays =
        Math.floor(
          (weekEndDate.getTime() - weekStartDate.getTime()) /
            (24 * 60 * 60 * 1000),
        ) + 1;
      const trendScores = calculateReportScores(
        weekBoogleRecords,
        weekLifeRecords,
        trendPeriodDays,
      );

      weeklyTrend.push({
        weekIndex,
        weekStartDate: this.toDateString(weekStartDate),
        weekEndDate: this.toDateString(weekEndDate),
        bowelCount:
          weeklyRecord?.bowelCount ??
          weekBoogleRecords.filter((record) => record.hasBowel).length,
        conditionScore: trendScores.conditionScore,
      });

      weekStartDate = this.addDays(weekStartDate, 7);
      weekIndex += 1;
    }

    return weeklyTrend;
  }

  private minDate(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
  }

  private buildMonthlyLifeFactorStats(
    lifeRecords: LifeRecordForReport[],
  ): MonthlyLifeFactorStatsDto {
    return {
      lowSleepCount: lifeRecords.filter((record) => record.sleepTime === 1)
        .length,
      highCaffeineCount: lifeRecords.filter((record) => record.caffeine === 'M')
        .length,
      noExerciseCount: lifeRecords.filter((record) => record.exercise === 'N')
        .length,
      highStressCount: lifeRecords.filter((record) => record.stress === 'H')
        .length,
      lowWaterCount: lifeRecords.filter((record) => record.water === 'L')
        .length,
      irregularMealCount: lifeRecords.filter(
        (record) => record.mealRegular === 'I',
      ).length,
    };
  }

  private resolveMonthlyUserType(
    recordStats: MonthlyRecordStatsDto,
    boogleRecords: BoogleRecordForReport[],
    lifeRecords: LifeRecordForReport[],
  ): MonthlyUserTypeDto {
    if (recordStats.recordedDays < 15) {
      return this.buildMonthlyUserType('N');
    }

    const bowelRecords = boogleRecords.filter((record) => record.hasBowel);
    const bowelDateSet = new Set(
      bowelRecords.map((record) => this.toDateString(record.regDate)),
    );
    const bowelDays = bowelDateSet.size;
    const averageInterval = bowelDays === 0 ? 30 : 30 / bowelDays;

    const validStoolRecords = bowelRecords.filter(
      (record) =>
        record.stoolSimple === 'H' ||
        record.stoolSimple === 'M' ||
        record.stoolSimple === 'T',
    );
    const denominator = validStoolRecords.length;
    const hardRatio =
      denominator === 0
        ? 0
        : (validStoolRecords.filter((record) => record.stoolSimple === 'H')
            .length /
            denominator) *
          100;
    const normalRatio =
      denominator === 0
        ? 0
        : (validStoolRecords.filter((record) => record.stoolSimple === 'M')
            .length /
            denominator) *
          100;
    const looseRatio =
      denominator === 0
        ? 0
        : (validStoolRecords.filter((record) => record.stoolSimple === 'T')
            .length /
            denominator) *
          100;

    const abnormalStoolDateSet = new Set(
      bowelRecords
        .filter(
          (record) => record.stoolSimple === 'H' || record.stoolSimple === 'T',
        )
        .map((record) => this.toDateString(record.regDate)),
    );

    const lifeIssueDateSet = new Set(
      lifeRecords
        .filter(
          (record) =>
            record.sleep === 'B' ||
            record.stress === 'H' ||
            record.water === 'L' ||
            (record.waterIntake !== null && record.waterIntake <= 2),
        )
        .map((record) => this.toDateString(record.regDate)),
    );
    const abnormalCompanionDays = [...lifeIssueDateSet].filter((dateKey) =>
      abnormalStoolDateSet.has(dateKey),
    ).length;
    const abnormalCompanionRatio =
      lifeIssueDateSet.size === 0
        ? 0
        : (abnormalCompanionDays / lifeIssueDateSet.size) * 100;

    // 확정 우선순위: C -> L -> R -> I -> U
    if (averageInterval >= 3 && hardRatio >= 35) {
      return this.buildMonthlyUserType('C');
    }

    if (looseRatio >= 35 && bowelDays >= 26) {
      return this.buildMonthlyUserType('L');
    }

    if (bowelDays >= 13 && normalRatio >= 50) {
      return this.buildMonthlyUserType('R');
    }

    if (lifeIssueDateSet.size >= 8 && abnormalCompanionRatio >= 60) {
      return this.buildMonthlyUserType('I');
    }

    return this.buildMonthlyUserType('U');
  }

  private buildMonthlyUserType(code: string): MonthlyUserTypeDto {
    const userTypeMap: Record<string, MonthlyUserTypeDto> = {
      R: {
        code: 'R',
        name: '규칙형',
        description:
          '최근 30일 동안 배변 리듬이 비교적 안정적으로 유지되고 있어요.',
      },
      C: {
        code: 'C',
        name: '변비경향형',
        description: '딱딱한 변이나 긴 배변 간격이 반복되는 경향이 있어요.',
      },
      L: {
        code: 'L',
        name: '묽은변경향형',
        description: '묽은 변이나 잦은 배변이 반복되는 경향이 있어요.',
      },
      I: {
        code: 'I',
        name: '생활영향형',
        description:
          '수면, 스트레스, 수분, 식사 같은 생활 요인의 영향이 커 보여요.',
      },
      U: {
        code: 'U',
        name: '불규칙형',
        description:
          '배변 리듬이 일정하지 않아 생활 패턴과 함께 관찰이 필요해요.',
      },
      N: {
        code: 'N',
        name: '기록부족형',
        description: '기록이 부족해 정확한 유형 분석이 어려워요.',
        characterImageUrl: null,
      },
    };

    return userTypeMap[code] ?? userTypeMap.N;
  }

  private resolveMonthlyState(conditionScore: number | null): number {
    if (conditionScore === null) return 3;
    if (conditionScore >= 80) return 1;
    if (conditionScore >= 60) return 2;
    return 3;
  }

  private getStateLabel(state: number): string {
    if (state === 1) return '좋음';
    if (state === 2) return '보통';
    return '주의 필요';
  }

  private buildMonthlyPdf(): MonthlyPdfDto {
    return {
      downloadAvailable: true,
      endpoint: MONTHLY_PDF_ENDPOINT,
    };
  }

  // 공통함수
  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  // PDF 함수들
  private async findMemberForPdf(userId: bigint): Promise<MemberForPdf | null> {
    return this.prisma.member.findFirst({
      where: {
        id: userId,
        status: 'A',
      },
      select: {
        name: true,
        nickname: true,
        subscription: true,
        subscriptionDate: true,
      },
    });
  }

  private async findBoogleRecordsForPdf(
    userId: bigint,
    startDate: Date,
    endDateExclusive: Date,
  ): Promise<BoogleRecordForPdf[]> {
    return this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: startDate,
          lt: endDateExclusive,
        },
      },
      select: {
        id: true,
        regDate: true,
        hasBowel: true,
        stoolBristol: true,
        stoolSimple: true,
        bowelFeeling: true,
        stomach: true,
        distension: true,
        remainingFeeling: true,
        urgency: true,
        takenTime: true,
        amount: true,
        color: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }

  private async findLifeRecordsForPdf(
    userId: bigint,
    startDate: Date,
    endDateExclusive: Date,
  ): Promise<LifeRecordForPdf[]> {
    return this.prisma.lifeRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: startDate,
          lt: endDateExclusive,
        },
      },
      select: {
        id: true,
        regDate: true,
        sleep: true,
        sleepTime: true,
        stress: true,
        water: true,
        mealRegular: true,
        exercise: true,
        caffeine: true,
        outing: true,
        hormone: true,
        memo: true,
        autoTags: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }

  private async findWeeklyRecordsForPdf(
    userId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<WeeklyRecordForPdf[]> {
    const startWeekDate = this.getCurrentWeekStartOfDate(startDate);
    const endDateExclusive = this.addDays(endDate, 1);

    return this.prisma.weeklyRecord.findMany({
      where: {
        userId,
        weekStartDate: {
          gte: startWeekDate,
          lt: endDateExclusive,
        },
      },
      select: {
        weekStartDate: true,
        bowelCount: true,
        intervalAvg: true,
        completionScore: true,
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });
  }

  private async findMonthlyRecordsForPdf(
    userId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<MonthlyRecordForPdf[]> {
    const monthStartDate = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
    );

    const nextMonthAfterEndDate = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 1),
    );

    return this.prisma.monthlyRecord.findMany({
      where: {
        userId,
        monthStartDate: {
          gte: monthStartDate,
          lt: nextMonthAfterEndDate,
        },
      },
      select: {
        monthStartDate: true,
        bowelCount: true,
        intervalAvg: true,
        state: true,
        completionScore: true,
        conditionScore: true,
        userType: true,
      },
      orderBy: {
        monthStartDate: 'asc',
      },
    });
  }

  private async findGuideContentsForPdf(
    ruleCodes: string[],
  ): Promise<GuideContentForPdf[]> {
    if (ruleCodes.length === 0) {
      return [];
    }

    const ruleCodeSet = new Set<string>(ruleCodes);
    const matchedBindings = PATTERN_GUIDE_BINDINGS.filter((binding) =>
      binding.ruleCodes.some((ruleCode) => ruleCodeSet.has(ruleCode)),
    );

    if (matchedBindings.length === 0) {
      return [];
    }

    const bindingMap = new Map<string, PatternGuideBinding>(
      matchedBindings.map((binding) => [binding.guideTitle, binding]),
    );

    const guides = await this.prisma.guide.findMany({
      where: {
        category: 'P',
        status: 'A',
        title: {
          in: matchedBindings.map((binding) => binding.guideTitle),
        },
      },
      select: {
        title: true,
        category: true,
        guideContents: {
          select: {
            content: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return guides.flatMap((guide) => {
      const binding = bindingMap.get(guide.title);
      const matchedRuleCode =
        binding?.ruleCodes.find((ruleCode) => ruleCodeSet.has(ruleCode)) ??
        null;

      return guide.guideContents.map((guideContent) => ({
        ruleCode: matchedRuleCode,
        title: guide.title,
        category: guide.category,
        content: guideContent.content,
      }));
    });
  }

  private parseRequiredDate(value: string, fieldName: string): Date {
    const parsedDate = this.parseDateString(value);

    if (parsedDate === null) {
      throw new BusinessException(
        ReportErrorCode.REPORT_INVALID_DATE_FORMAT,
        `${fieldName}는 YYYY-MM-DD 형식이어야 합니다.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
  }

  private assertPdfRangeAllowed(
    startDate: Date,
    endDate: Date,
    member: MemberForPdf,
  ): void {
    const requestedDays = this.getInclusiveDays(startDate, endDate);

    const maxDays =
      member.subscription === 'Y' ? PREMIUM_PDF_MAX_DAYS : FREE_PDF_MAX_DAYS;

    if (requestedDays > maxDays) {
      throw new BusinessException(
        ReportErrorCode.REPORT_PDF_RANGE_EXCEEDED,
        'PDF 리포트 생성 가능 기간을 초과했습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private getInclusiveDays(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    return (
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
      ) + 1
    );
  }

  private getCurrentWeekStartOfDate(date: Date): Date {
    const copiedDate = new Date(date);
    const dayOfWeek = copiedDate.getUTCDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    return this.addDays(copiedDate, diff);
  }

  private buildPdfFilename(startDate: Date, endDate: Date): string {
    const start = this.toDateString(startDate).replaceAll('-', '');
    const end = this.toDateString(endDate).replaceAll('-', '');

    return `boogle_report_${start}-${end}.pdf`;
  }

  private detectPdfRuleCodes(
    boogleRecords: BoogleRecordForPdf[],
    lifeRecords: LifeRecordForPdf[],
    weeklyRecords: WeeklyRecordForPdf[],
    monthlyRecords: MonthlyRecordForPdf[],
  ): string[] {
    const ruleCodes = new Set<string>();

    const bowelCount = boogleRecords.filter((record) => record.hasBowel).length;
    const hardStoolCount = boogleRecords.filter(
      (record) => record.hasBowel && record.stoolSimple === 'H',
    ).length;
    const looseStoolCount = boogleRecords.filter(
      (record) => record.hasBowel && record.stoolSimple === 'T',
    ).length;

    const lowSleepCount = lifeRecords.filter(
      (record) => record.sleepTime === 1,
    ).length;
    const highStressCount = lifeRecords.filter(
      (record) => record.stress === 'H',
    ).length;
    const lowWaterCount = lifeRecords.filter(
      (record) => record.water === 'L',
    ).length;
    const highCaffeineCount = lifeRecords.filter(
      (record) => record.caffeine === 'M',
    ).length;

    if (bowelCount > 0 && bowelCount <= 2) {
      ruleCodes.add('LOW_BOWEL_COUNT');
    }

    if (bowelCount >= 10) {
      ruleCodes.add('HIGH_BOWEL_COUNT');
    }

    if (hardStoolCount >= 2) {
      ruleCodes.add('CONSTIPATION_PATTERN');
    }

    if (looseStoolCount >= 2) {
      ruleCodes.add('LOOSE_STOOL_PATTERN');
    }

    if (lowSleepCount >= 2) {
      ruleCodes.add('LOW_SLEEP');
    }

    if (highStressCount >= 2) {
      ruleCodes.add('HIGH_STRESS');
    }

    if (lowWaterCount >= 2) {
      ruleCodes.add('LOW_WATER');
    }

    if (highCaffeineCount >= 2) {
      ruleCodes.add('HIGH_CAFFEINE');
    }

    if (
      weeklyRecords.some(
        (record) =>
          record.completionScore !== null && record.completionScore < 50,
      ) ||
      monthlyRecords.some(
        (record) =>
          record.completionScore !== null && record.completionScore < 50,
      )
    ) {
      ruleCodes.add('LOW_COMPLETION_SCORE');
    }

    return [...ruleCodes];
  }

  private async buildPdfReportBuffer(
    data: PdfReportBuildData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Boogle Report',
          Author: 'Boogle',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.registerPdfFont(doc);

      const userName = data.member.nickname ?? data.member.name ?? '사용자';

      doc.fontSize(22).text('Boogle 리포트', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`대상 사용자: ${userName}`);
      doc.text(
        `기간: ${this.toDateString(data.startDate)} ~ ${this.toDateString(
          data.endDate,
        )}`,
      );
      doc.text(`생성일: ${this.toDateString(new Date())}`);
      doc.moveDown();

      doc.fontSize(16).text('1. 전체 요약');
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`배변 기록 수: ${data.boogleRecords.length}개`);
      doc.text(`생활 기록 수: ${data.lifeRecords.length}개`);
      doc.text(`주간 요약 수: ${data.weeklyRecords.length}개`);
      doc.text(`월간 요약 수: ${data.monthlyRecords.length}개`);
      doc.moveDown();

      if (data.weeklyRecords.length > 0) {
        doc.fontSize(16).text('2. 주간 요약');
        doc.moveDown(0.5);
        doc.fontSize(10);

        for (const record of data.weeklyRecords) {
          doc.text(
            `${this.toDateString(record.weekStartDate)} | 배변 ${record.bowelCount ?? 0}회 | 평균 간격 ${record.intervalAvg ?? '-'}일 | 완성도 ${record.completionScore ?? 0}%`,
          );
        }

        doc.moveDown();
      }

      if (data.monthlyRecords.length > 0) {
        doc.fontSize(16).text('3. 월간 요약');
        doc.moveDown(0.5);
        doc.fontSize(10);

        for (const record of data.monthlyRecords) {
          doc.text(
            `${this.toDateString(record.monthStartDate)} | 배변 ${record.bowelCount ?? 0}회 | 평균 간격 ${record.intervalAvg ?? '-'}일 | 완성도 ${record.completionScore ?? 0}% | 컨디션 ${record.conditionScore ?? '-'}점`,
          );
        }

        doc.moveDown();
      }

      if (data.guides.length > 0) {
        doc.fontSize(16).text('4. 패턴 및 가이드');
        doc.moveDown(0.5);
        doc.fontSize(10);

        for (const guide of data.guides) {
          doc.text(`[${guide.ruleCode ?? 'GUIDE'}] ${guide.title}`);
          doc.text(guide.content);
          doc.moveDown(0.5);
        }

        doc.moveDown();
      }

      if (data.includeDailyRecords) {
        this.appendDailyRecordsToPdf(doc, data.boogleRecords, data.lifeRecords);
      }

      doc.end();
    });
  }

  private registerPdfFont(doc: PDFKit.PDFDocument): void {
    const fontPaths = [
      join(process.cwd(), 'src', 'assets', 'fonts', 'NanumGothic.ttf'),
      join(__dirname, '..', 'assets', 'fonts', 'NanumGothic.ttf'),
    ];

    const fontPath = fontPaths.find((path) => existsSync(path));

    if (fontPath !== undefined) {
      doc.registerFont('NanumGothic', fontPath);
      doc.font('NanumGothic');
      return;
    }

    doc.font('Helvetica');
  }

  private appendDailyRecordsToPdf(
    doc: PDFKit.PDFDocument,
    boogleRecords: BoogleRecordForPdf[],
    lifeRecords: LifeRecordForPdf[],
  ): void {
    doc.addPage();

    doc.fontSize(16).text('5. 일별 상세 기록');
    doc.moveDown();

    if (boogleRecords.length > 0) {
      doc.fontSize(13).text('배변 기록');
      doc.moveDown(0.5);
      doc.fontSize(9);

      for (const record of boogleRecords) {
        doc.text(
          `${this.toDateString(record.regDate)} | 배변 여부 ${record.hasBowel ? 'Y' : 'N'} | 브리스톨 ${record.stoolBristol ?? '-'} | 변 상태 ${record.stoolSimple ?? '-'} | 배변감 ${record.bowelFeeling ?? '-'} | 복통 ${record.stomach ?? '-'} | 복부팽만 ${record.distension ?? '-'}`,
        );
      }

      doc.moveDown();
    }

    if (lifeRecords.length > 0) {
      doc.fontSize(13).text('생활 기록');
      doc.moveDown(0.5);
      doc.fontSize(9);

      for (const record of lifeRecords) {
        doc.text(
          `${this.toDateString(record.regDate)} | 수면 ${record.sleepTime ?? '-'} | 스트레스 ${record.stress ?? '-'} | 수분 ${record.water ?? '-'} | 운동 ${record.exercise ?? '-'} | 카페인 ${record.caffeine ?? '-'} | 메모 ${record.memo ?? '-'}`,
        );
      }
    }
  }
}
