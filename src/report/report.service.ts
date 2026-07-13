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
  MonthlyPatternCardDto,
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
  BoogleRecordForWeekly,
  LifeRecordForWeekly,
  DetectedRule,
  WeeklyRecordForReport,
  MonthlyRecordForReport,
  WeeklyRecordForTrend,
} from './dto/report-record.dto';
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
import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';

const TOTAL_WEEK_DAYS = 7;
const REQUIRED_RECORDED_DAYS = 3;

const MIN_MONTHLY_COMPLETION_SCORE = 50;
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
      const nextPreviousWeekStartDate = weekStartDate;

      const period = this.buildPeriod(weekStartDate, weekEndDate);

      const [
        weeklyRecord,
        previousWeeklyRecord,
        boogleRecords,
        lifeRecords,
        previousBoogleRecords,
        previousLifeRecords,
      ] = await Promise.all([
        this.findWeeklyRecord(userId, weekStartDate),
        this.findWeeklyRecord(userId, previousWeekStartDate),
        this.findBoogleRecords(userId, weekStartDate, nextWeekStartDate),
        this.findLifeRecords(userId, weekStartDate, nextWeekStartDate),
        this.findBoogleRecords(
          userId,
          previousWeekStartDate,
          nextPreviousWeekStartDate,
        ),
        this.findLifeRecords(
          userId,
          previousWeekStartDate,
          nextPreviousWeekStartDate,
        ),
      ]);

      const recordStats = this.buildRecordStats(
        boogleRecords,
        lifeRecords,
        weeklyRecord,
      );
      const previousRecordStats = this.buildRecordStats(
        previousBoogleRecords,
        previousLifeRecords,
        previousWeeklyRecord,
      );

      const previousSummary = this.buildPreviousSummary(
        previousWeekStartDate,
        previousWeekEndDate,
        previousWeeklyRecord,
        previousBoogleRecords,
        previousRecordStats,
      );

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
      const changeSummary =
        previousSummary === null
          ? null
          : this.buildChangeSummary(summary, previousSummary);

      const stoolDistribution = this.buildStoolDistribution(boogleRecords);
      const bowelRhythmByDay = this.buildBowelRhythmByDay(
        boogleRecords,
        weekStartDate,
      );
      const frequentTimeSlots = this.buildFrequentTimeSlots(boogleRecords);
      const lifeFactorStats = this.buildLifeFactorStats(lifeRecords);
      const detectedRules = this.detectPatternCards(
        summary,
        stoolDistribution,
        lifeFactorStats,
        boogleRecords,
      );

      const guides = await this.findGuidesByRules(
        userId,
        detectedRules.map((rule) => rule.ruleCode),
        includeGuide,
      );

      return {
        period,
        dataStatus: 'ENOUGH',
        summary,
        recordStats,
        previousSummary,
        changeSummary,
        stoolDistribution,
        bowelRhythmByDay,
        frequentTimeSlots,
        lifeFactorStats,
        patternCards: detectedRules.map((rule) => rule.card),
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
      const nextMonthStartDate = this.addMonths(monthStartDate, 1);
      const monthEndDate = this.addDays(nextMonthStartDate, -1);

      const previousMonthStartDate = this.addMonths(monthStartDate, -1);
      const nextPreviousMonthStartDate = monthStartDate;
      const previousMonthEndDate = this.addDays(monthStartDate, -1);

      const period = this.buildMonthlyPeriod(monthStartDate, monthEndDate);

      const [
        monthlyRecord,
        previousMonthlyRecord,
        weeklyRecords,
        boogleRecords,
        lifeRecords,
        previousBoogleRecords,
        previousLifeRecords,
      ] = await Promise.all([
        this.findMonthlyRecord(userId, monthStartDate),
        this.findMonthlyRecord(userId, previousMonthStartDate),
        this.findWeeklyRecordsForMonth(
          userId,
          monthStartDate,
          nextMonthStartDate,
        ),
        this.findBoogleRecords(userId, monthStartDate, nextMonthStartDate),
        this.findLifeRecords(userId, monthStartDate, nextMonthStartDate),
        this.findBoogleRecords(
          userId,
          previousMonthStartDate,
          nextPreviousMonthStartDate,
        ),
        this.findLifeRecords(
          userId,
          previousMonthStartDate,
          nextPreviousMonthStartDate,
        ),
      ]);

      const recordStats = this.buildMonthlyRecordStats(
        boogleRecords,
        lifeRecords,
        monthEndDate,
      );

      const previousRecordStats = this.buildMonthlyRecordStats(
        previousBoogleRecords,
        previousLifeRecords,
        previousMonthEndDate,
      );

      const summary = this.buildMonthlySummary(
        monthlyRecord,
        boogleRecords,
        lifeRecords,
        recordStats,
      );

      const previousSummary = this.buildPreviousMonthlySummary(
        previousMonthlyRecord,
        previousBoogleRecords,
        previousLifeRecords,
        previousRecordStats,
        previousMonthStartDate,
        previousMonthEndDate,
      );

      const pdf = this.buildMonthlyPdf();

      if (recordStats.recordedDays === 0) {
        return {
          period,
          dataStatus: 'NO_RECORD',
          summary,
          recordStats,
          previousSummary,
          changeSummary:
            this.buildMonthlyNoPreviousOrNoRecordChangeSummary(previousSummary),
          stoolDistribution: [],
          weeklyTrend: [],
          lifeFactorStats: null,
          userType: this.buildMonthlyUserType('N'),
          patternCards: [],
          pdf,
          notice: {
            code: 'MONTHLY_NO_RECORD',
            message:
              '아직 이번 달 기록이 없어요. 기록을 시작하면 월간 리포트를 확인할 수 있어요!',
          },
        };
      }

      if (recordStats.completionScore < MIN_MONTHLY_COMPLETION_SCORE) {
        return {
          period,
          dataStatus: 'LOW_COMPLETION',
          summary: {
            ...summary,
            conditionScore: null,
            state: 3,
            stateLabel: '주의 필요',
          },
          recordStats,
          previousSummary,
          changeSummary: this.buildMonthlyLowCompletionChangeSummary(
            summary,
            previousSummary,
          ),
          stoolDistribution: [],
          weeklyTrend: [],
          lifeFactorStats: null,
          userType: this.buildMonthlyUserType('N'),
          patternCards: [],
          pdf,
          notice: {
            code: 'MONTHLY_LOW_COMPLETION_SCORE',
            message: '기록이 부족해 일부 통계가 부정확할 수 있어요!',
          },
        };
      }

      const stoolDistribution =
        this.buildMonthlyStoolDistribution(boogleRecords);
      const weeklyTrend = this.buildWeeklyTrend(
        weeklyRecords,
        boogleRecords,
        lifeRecords,
        monthStartDate,
        monthEndDate,
      );
      const lifeFactorStats = this.buildMonthlyLifeFactorStats(lifeRecords);
      const userType = this.resolveMonthlyUserType(
        monthlyRecord,
        summary,
        stoolDistribution,
        lifeFactorStats,
      );
      const patternCards = includePattern
        ? this.detectMonthlyPatternCards(
            summary,
            stoolDistribution,
            lifeFactorStats,
            userType,
          )
        : [];

      return {
        period,
        dataStatus: 'ENOUGH',
        summary,
        recordStats,
        previousSummary,
        changeSummary: this.buildMonthlyChangeSummary(summary, previousSummary),
        stoolDistribution,
        weeklyTrend,
        lifeFactorStats,
        userType,
        patternCards,
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
  ): Promise<BoogleRecordForWeekly[]> {
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
        regDate: true,
        hasBowel: true,
        stoolSimple: true,
        bowelFeeling: true,
        stomach: true,
        distension: true,
        remainingFeeling: true,
        urgency: true,
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
  ): Promise<LifeRecordForWeekly[]> {
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
        regDate: true,
        sleepTime: true,
        caffeine: true,
        exercise: true,
        stress: true,
        water: true,
        mealRegular: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }
  // 월간기록 조회
  private async findMonthlyRecord(
    userId: bigint,
    monthStartDate: Date,
  ): Promise<MonthlyRecordForReport | null> {
    return this.prisma.monthlyRecord.findFirst({
      where: {
        userId,
        monthStartDate,
      },
      select: {
        bowelCount: true,
        intervalAvg: true,
        state: true,
        completionScore: true,
        conditionScore: true,
        userType: true,
      },
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
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
    weeklyRecord?: WeeklyRecordForReport | null,
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

    const calculatedCompletionScore = this.round1(
      (recordedDateSet.size / TOTAL_WEEK_DAYS) * 100,
    );

    return {
      totalDays: TOTAL_WEEK_DAYS,
      recordedDays: recordedDateSet.size,
      boogleRecordDays: boogleRecordDateSet.size,
      lifeRecordDays: lifeRecordDateSet.size,
      requiredDays: REQUIRED_RECORDED_DAYS,
      completionScore:
        weeklyRecord?.completionScore ?? calculatedCompletionScore,
    };
  }

  private buildSummary(
    weeklyRecord: WeeklyRecordForReport | null,
    boogleRecords: BoogleRecordForWeekly[],
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
      completionScore:
        weeklyRecord?.completionScore ?? recordStats.completionScore,
    };
  }

  private buildPreviousSummary(
    previousWeekStartDate: Date,
    previousWeekEndDate: Date,
    previousWeeklyRecord: WeeklyRecordForReport | null,
    previousBoogleRecords: BoogleRecordForWeekly[],
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
    boogleRecords: BoogleRecordForWeekly[],
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
    boogleRecords: BoogleRecordForWeekly[],
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
    boogleRecords: BoogleRecordForWeekly[],
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
    lifeRecords: LifeRecordForWeekly[],
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

  private detectPatternCards(
    summary: WeeklySummaryDto,
    stoolDistribution: StoolDistributionDto[],
    lifeFactorStats: LifeFactorStatsDto,
    boogleRecords: BoogleRecordForWeekly[],
  ): DetectedRule[] {
    const detectedRules: DetectedRule[] = [];
    const hardStoolCount =
      stoolDistribution.find((item) => item.stoolSimple === 'H')?.count ?? 0;
    const looseStoolCount =
      stoolDistribution.find((item) => item.stoolSimple === 'T')?.count ?? 0;
    const difficultBowelCount = boogleRecords.filter(
      (record) => record.hasBowel && record.bowelFeeling === 'H',
    ).length;

    if (summary.bowelCount <= 2) {
      detectedRules.push({
        ruleCode: 'LOW_BOWEL_COUNT',
        card: {
          level: 'WARN',
          ruleCode: 'LOW_BOWEL_COUNT',
          title: '이번 주 배변 횟수가 적은 편이에요',
          description:
            '이번 주 배변 횟수가 적게 기록되었어요. 수분 섭취와 식사 리듬을 함께 확인해보세요.',
        },
      });
    }

    if (summary.bowelCount >= 10) {
      detectedRules.push({
        ruleCode: 'HIGH_BOWEL_COUNT',
        card: {
          level: 'WARN',
          ruleCode: 'HIGH_BOWEL_COUNT',
          title: '이번 주 배변 횟수가 많은 편이에요',
          description:
            '배변 횟수가 평소보다 많다면 묽은 변, 복통, 긴박감이 함께 있었는지 확인해보세요.',
        },
      });
    }

    if (hardStoolCount >= 2) {
      detectedRules.push({
        ruleCode: 'CONSTIPATION_PATTERN',
        card: {
          level: 'WARN',
          ruleCode: 'CONSTIPATION_PATTERN',
          title: '딱딱한 변이 반복해서 나타났어요',
          description:
            '이번 주 기록에서 딱딱한 변이 여러 번 나타났어요. 수분과 식이섬유 섭취를 점검해보세요.',
        },
      });
    }

    if (looseStoolCount >= 2) {
      detectedRules.push({
        ruleCode: 'LOOSE_STOOL_PATTERN',
        card: {
          level: 'WARN',
          ruleCode: 'LOOSE_STOOL_PATTERN',
          title: '묽은 변이 반복해서 나타났어요',
          description:
            '이번 주 기록에서 묽은 변이 여러 번 나타났어요. 자극적인 음식이나 카페인 섭취를 함께 확인해보세요.',
        },
      });
    }

    if (
      lifeFactorStats.lowWater.count >= 2 &&
      (hardStoolCount > 0 || difficultBowelCount > 0)
    ) {
      detectedRules.push({
        ruleCode: 'LOW_WATER',
        card: {
          level: 'WARN',
          ruleCode: 'LOW_WATER',
          title: '수분 섭취가 부족한 날에 배변이 불편했어요',
          description:
            '이번 주 기록에서 수분 섭취가 부족한 날에 딱딱한 변이나 힘든 배변이 함께 나타났어요.',
        },
      });
    }

    if (lifeFactorStats.highStress.count >= 2) {
      detectedRules.push({
        ruleCode: 'HIGH_STRESS',
        card: {
          level: 'WARN',
          ruleCode: 'HIGH_STRESS',
          title: '스트레스가 높은 날이 반복되었어요',
          description:
            '스트레스가 높은 날이 여러 번 기록되었어요. 장 컨디션 변화와 함께 확인해보세요.',
        },
      });
    }

    if (lifeFactorStats.lowSleep.count >= 2) {
      detectedRules.push({
        ruleCode: 'LOW_SLEEP',
        card: {
          level: 'WARN',
          ruleCode: 'LOW_SLEEP',
          title: '수면이 부족한 날이 반복되었어요',
          description:
            '수면 부족은 장 리듬에도 영향을 줄 수 있어요. 이번 주 수면 패턴을 점검해보세요.',
        },
      });
    }

    if (lifeFactorStats.highCaffeine.count >= 2) {
      detectedRules.push({
        ruleCode: 'HIGH_CAFFEINE',
        card: {
          level: 'WARN',
          ruleCode: 'HIGH_CAFFEINE',
          title: '카페인 섭취가 많은 날이 있었어요',
          description:
            '카페인 섭취가 많은 날이 반복되었어요. 묽은 변이나 복부 불편감과 함께 나타났는지 확인해보세요.',
        },
      });
    }

    return this.deduplicateRules(detectedRules);
  }

  private deduplicateRules(rules: DetectedRule[]): DetectedRule[] {
    const ruleMap = new Map<string, DetectedRule>();

    for (const rule of rules) {
      if (!ruleMap.has(rule.ruleCode)) {
        ruleMap.set(rule.ruleCode, rule);
      }
    }

    return [...ruleMap.values()];
  }

  private async findGuidesByRules(
    userId: bigint,
    ruleCodes: string[],
    includeGuide: boolean,
  ): Promise<WeeklyGuideDto[]> {
    if (!includeGuide || ruleCodes.length === 0) {
      return [];
    }

    const guideRules = await this.prisma.guideRule.findMany({
      where: {
        ruleCode: {
          in: ruleCodes,
        },
        guideContent: {
          status: 'A',
          category: 'P',
        },
      },
      select: {
        ruleCode: true,
        guideContent: {
          select: {
            id: true,
            category: true,
            title: true,
            content: true,
          },
        },
      },
    });

    const guideContentMap = new Map<
      number,
      {
        id: number;
        category: string | null;
        title: string;
        content: string;
      }
    >();

    for (const guideRule of guideRules) {
      guideContentMap.set(guideRule.guideContent.id, guideRule.guideContent);
    }

    const guideContents = [...guideContentMap.values()];

    if (guideContents.length === 0) {
      return [];
    }

    const feedbacks = await this.prisma.guideFeedback.findMany({
      where: {
        userId,
        guideContentId: {
          in: guideContents.map((guideContent) => guideContent.id),
        },
      },
      select: {
        guideContentId: true,
        feedback: true,
      },
    });

    const feedbackMap = new Map(
      feedbacks.map((feedback) => [feedback.guideContentId, feedback.feedback]),
    );

    return guideContents.map((guideContent) => ({
      guideContentId: guideContent.id,
      category: guideContent.category,
      title: guideContent.title,
      content: guideContent.content,
      feedbackStatus: feedbackMap.get(guideContent.id) ?? null,
    }));
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
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
    monthEndDate: Date,
  ): MonthlyRecordStatsDto {
    const totalDays = monthEndDate.getUTCDate();
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
    return {
      totalDays,
      recordedDays: recordedDateSet.size,
      boogleRecordDays: boogleRecordDateSet.size,
      lifeRecordDays: lifeRecordDateSet.size,
      requiredDays: Math.ceil(totalDays * 0.5),
      completionScore: this.round1((recordedDateSet.size / totalDays) * 100),
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
    monthlyRecord: MonthlyRecordForReport | null,
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
    recordStats: MonthlyRecordStatsDto,
  ): MonthlySummaryDto {
    const bowelCount =
      monthlyRecord?.bowelCount ??
      boogleRecords.filter((record) => record.hasBowel).length;

    const intervalAvg =
      monthlyRecord?.intervalAvg ??
      (bowelCount === 0 ? 0 : this.round1(recordStats.totalDays / bowelCount));

    const conditionScore =
      recordStats.completionScore < MIN_MONTHLY_COMPLETION_SCORE
        ? null
        : (monthlyRecord?.conditionScore ??
          this.calculateConditionScore(boogleRecords, lifeRecords));

    const state =
      monthlyRecord?.state ?? this.resolveMonthlyState(conditionScore);

    return {
      bowelCount,
      intervalAvg,
      completionScore:
        monthlyRecord?.completionScore ?? recordStats.completionScore,
      conditionScore,
      state,
      stateLabel: this.getStateLabel(state),
    };
  }

  private buildPreviousMonthlySummary(
    monthlyRecord: MonthlyRecordForReport | null,
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
    recordStats: MonthlyRecordStatsDto,
    monthStartDate: Date,
    monthEndDate: Date,
  ): PreviousMonthlySummaryDto | null {
    if (monthlyRecord === null && recordStats.recordedDays === 0) {
      return null;
    }

    const summary = this.buildMonthlySummary(
      monthlyRecord,
      boogleRecords,
      lifeRecords,
      recordStats,
    );

    return {
      period: this.buildMonthlyPeriod(monthStartDate, monthEndDate),
      ...summary,
      userType: monthlyRecord?.userType ?? null,
      userTypeLabel:
        monthlyRecord?.userType === undefined ||
        monthlyRecord?.userType === null
          ? null
          : this.buildMonthlyUserType(monthlyRecord.userType).name,
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

  private buildMonthlyLowCompletionChangeSummary(
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

    return {
      compareType: 'PREVIOUS_MONTH',
      compareAvailable: false,
      reasonCode: 'CURRENT_LOW_COMPLETION',
      bowelCountDiff: null,
      bowelCountChangeRate: null,
      intervalAvgDiff: null,
      completionScoreDiff: this.round1(
        current.completionScore - previous.completionScore,
      ),
      conditionScoreDiff: null,
      trend: 'LOW_COMPLETION',
      description:
        '이번 달 기록 완성도가 낮아 지난달과 정확한 비교가 어려워요.',
    };
  }

  private buildMonthlyNoPreviousOrNoRecordChangeSummary(
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

    return {
      compareType: 'PREVIOUS_MONTH',
      compareAvailable: false,
      reasonCode: 'CURRENT_LOW_COMPLETION',
      bowelCountDiff: null,
      bowelCountChangeRate: null,
      intervalAvgDiff: null,
      completionScoreDiff: null,
      conditionScoreDiff: null,
      trend: 'LOW_COMPLETION',
      description: '이번 달 기록이 없어 지난달과 정확한 비교가 어려워요.',
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
    boogleRecords: BoogleRecordForWeekly[],
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
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
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

      weeklyTrend.push({
        weekIndex,
        weekStartDate: this.toDateString(weekStartDate),
        weekEndDate: this.toDateString(weekEndDate),
        bowelCount:
          weeklyRecord?.bowelCount ??
          weekBoogleRecords.filter((record) => record.hasBowel).length,
        conditionScore: this.calculateConditionScore(
          weekBoogleRecords,
          weekLifeRecords,
        ),
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
    lifeRecords: LifeRecordForWeekly[],
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
    monthlyRecord: MonthlyRecordForReport | null,
    summary: MonthlySummaryDto,
    stoolDistribution: MonthlyStoolDistributionDto[],
    lifeFactorStats: MonthlyLifeFactorStatsDto,
  ): MonthlyUserTypeDto {
    if (monthlyRecord?.userType) {
      return this.buildMonthlyUserType(monthlyRecord.userType);
    }

    const hardRatio =
      stoolDistribution.find((item) => item.stoolSimple === 'H')?.ratio ?? 0;
    const normalRatio =
      stoolDistribution.find((item) => item.stoolSimple === 'M')?.ratio ?? 0;
    const looseRatio =
      stoolDistribution.find((item) => item.stoolSimple === 'T')?.ratio ?? 0;

    const lifeIssueCount =
      lifeFactorStats.lowSleepCount +
      lifeFactorStats.highCaffeineCount +
      lifeFactorStats.noExerciseCount +
      lifeFactorStats.highStressCount +
      lifeFactorStats.lowWaterCount +
      lifeFactorStats.irregularMealCount;

    if (summary.bowelCount <= 8 || hardRatio >= 35) {
      return this.buildMonthlyUserType('C');
    }
    if (summary.bowelCount >= 30 || looseRatio >= 35) {
      return this.buildMonthlyUserType('L');
    }
    if (lifeIssueCount >= 15) {
      return this.buildMonthlyUserType('I');
    }
    if (
      summary.conditionScore !== null &&
      summary.conditionScore >= 70 &&
      normalRatio >= 50
    ) {
      return this.buildMonthlyUserType('R');
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

  private detectMonthlyPatternCards(
    summary: MonthlySummaryDto,
    stoolDistribution: MonthlyStoolDistributionDto[],
    lifeFactorStats: MonthlyLifeFactorStatsDto,
    userType: MonthlyUserTypeDto,
  ): MonthlyPatternCardDto[] {
    const cards: MonthlyPatternCardDto[] = [];

    const hardCount =
      stoolDistribution.find((item) => item.stoolSimple === 'H')?.count ?? 0;
    const looseCount =
      stoolDistribution.find((item) => item.stoolSimple === 'T')?.count ?? 0;

    if (userType.code === 'R') {
      cards.push({
        level: 'OK',
        ruleCode: 'REGULAR_PATTERN',
        title: '배변 리듬이 안정적이에요',
        description:
          '이번 달은 평균 배변 간격이 일정하고 기록 완성도도 높은 편이에요.',
      });
    }

    if (hardCount >= 5 || userType.code === 'C') {
      cards.push({
        level: 'WARN',
        ruleCode: 'CONSTIPATION_PATTERN',
        title: '딱딱한 변이 반복해서 나타났어요',
        description:
          '이번 달에는 딱딱한 변이나 긴 배변 간격이 반복되는 경향이 있어요.',
      });
    }

    if (looseCount >= 5 || userType.code === 'L') {
      cards.push({
        level: 'WARN',
        ruleCode: 'LOOSE_STOOL_PATTERN',
        title: '묽은 변이 반복해서 나타났어요',
        description:
          '이번 달에는 묽은 변이나 잦은 배변이 반복되는 경향이 있어요.',
      });
    }

    if (lifeFactorStats.highStressCount >= 5) {
      cards.push({
        level: 'WARN',
        ruleCode: 'HIGH_STRESS',
        title: '스트레스가 높은 날에는 불편감이 늘었어요',
        description:
          '스트레스가 높게 기록된 날에 복부팽만이나 잔변감이 함께 나타나는 경향이 있어요.',
      });
    }

    if (lifeFactorStats.lowWaterCount >= 7) {
      cards.push({
        level: 'WARN',
        ruleCode: 'LOW_WATER',
        title: '수분 섭취가 부족한 날이 많았어요',
        description:
          '수분 섭취가 부족한 날이 반복되면 딱딱한 변이나 힘든 배변으로 이어질 수 있어요.',
      });
    }

    if (lifeFactorStats.lowSleepCount >= 7) {
      cards.push({
        level: 'WARN',
        ruleCode: 'LOW_SLEEP',
        title: '수면이 부족한 날이 많았어요',
        description:
          '수면 부족은 장 리듬에도 영향을 줄 수 있어요. 이번 달 수면 패턴을 점검해보세요.',
      });
    }

    if (lifeFactorStats.highCaffeineCount >= 7) {
      cards.push({
        level: 'WARN',
        ruleCode: 'HIGH_CAFFEINE',
        title: '카페인 섭취가 많은 날이 있었어요',
        description:
          '카페인 섭취가 많은 날이 반복되었어요. 묽은 변이나 복부 불편감과 함께 확인해보세요.',
      });
    }

    if (cards.length === 0 && summary.conditionScore !== null) {
      cards.push({
        level: 'OK',
        ruleCode: 'MONTHLY_STABLE_PATTERN',
        title: '이번 달 장 컨디션이 비교적 안정적이에요',
        description:
          '큰 이상 패턴은 두드러지지 않았어요. 현재 기록 습관을 이어가 보세요.',
      });
    }

    return this.deduplicateMonthlyPatternCards(cards);
  }

  private deduplicateMonthlyPatternCards(
    cards: MonthlyPatternCardDto[],
  ): MonthlyPatternCardDto[] {
    const cardMap = new Map<string, MonthlyPatternCardDto>();

    for (const card of cards) {
      if (!cardMap.has(card.ruleCode)) {
        cardMap.set(card.ruleCode, card);
      }
    }

    return [...cardMap.values()];
  }

  private calculateConditionScore(
    boogleRecords: BoogleRecordForWeekly[],
    lifeRecords: LifeRecordForWeekly[],
  ): number | null {
    const bowelRecords = boogleRecords.filter((record) => record.hasBowel);

    if (bowelRecords.length === 0) {
      return null;
    }

    let penalty = 0;

    for (const record of bowelRecords) {
      if (record.stoolSimple === 'H' || record.stoolSimple === 'T')
        penalty += 3;
      if (record.bowelFeeling === 'H') penalty += 4;
      if (record.stomach === 'M') penalty += 2;
      if (record.stomach === 'L') penalty += 4;
      if (record.distension === 'M') penalty += 2;
      if (record.distension === 'L') penalty += 4;
      if (record.remainingFeeling === 'M') penalty += 2;
      if (record.remainingFeeling === 'L') penalty += 4;
      if (record.urgency === 'M') penalty += 2;
      if (record.urgency === 'L') penalty += 4;
    }

    penalty += lifeRecords.filter((record) => record.stress === 'H').length;
    penalty += lifeRecords.filter((record) => record.water === 'L').length;
    penalty += lifeRecords.filter((record) => record.sleepTime === 1).length;
    penalty += lifeRecords.filter((record) => record.caffeine === 'M').length;

    return this.clamp(Math.round(100 - penalty), 0, 100);
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

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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
        memo: true,
        autoTags: true,
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

    const guideRules = await this.prisma.guideRule.findMany({
      where: {
        ruleCode: {
          in: ruleCodes,
        },
        guideContent: {
          status: 'A',
        },
      },
      select: {
        ruleCode: true,
        guideContent: {
          select: {
            title: true,
            category: true,
            content: true,
          },
        },
      },
    });

    return guideRules.map((guideRule) => ({
      ruleCode: guideRule.ruleCode,
      title: guideRule.guideContent.title,
      category: guideRule.guideContent.category,
      content: guideRule.guideContent.content,
    }));
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
          `${this.toDateString(record.regDate)} | 배변 여부 ${record.hasBowel ? 'Y' : 'N'} | 변 상태 ${record.stoolSimple ?? '-'} | 배변감 ${record.bowelFeeling ?? '-'} | 메모 ${record.memo ?? '-'}`,
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
