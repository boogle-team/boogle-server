import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from '@/report/report.service';
import {
  PATTERN_GUIDE_BINDINGS,
  type WeeklyRuleCode,
} from '@/report/pattern/weekly-pattern.constants';
import {
  getTodayKstDateKey,
  kstDayStart,
  toKstDateKey,
} from '@/common/utils/kst-date.util';
import type {
  GuideFeedbackStatus,
  GuideScreenResponseDto,
  WarningFlagDto,
} from './dto/guide-screen-response.dto';
import { GuideErrorCode } from './guide-error-code.enum';
import type {
  GuideAdviceItemDto,
  GuideContentItemDto,
  GuideDetailResponseDto,
  HealthGuideDetailResponseDto,
  PatternGuideDetailResponseDto,
  PatternGuideReasonDto,
  RecommendedGuideDto,
  WarningDetailFlagDto,
  WarningGuideAnalysisDto,
  WarningGuideDetailResponseDto,
} from './dto/guide-detail-response.dto';
import type { GuideFeedbackRequestDto } from './dto/guide-feedback-request.dto';
import type {
  CreateGuideFeedbackResponseDto,
  DeleteGuideFeedbackResponseDto,
  UpdateGuideFeedbackResponseDto,
} from './dto/guide-feedback-response.dto';
import type {
  GuideDetailRow,
  WarningDetailRecordRow,
  WarningRecordRow,
} from './dto/guide-record.dto';

const INTERNAL_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

@Injectable()
export class GuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
  ) {}

  async getGuideScreen(userId: bigint): Promise<GuideScreenResponseDto> {
    try {
      const weekStartDate = this.getCurrentMonday();
      const monthStartDate = this.getCurrentMonthStartDate();
      const nextMonthStartDate = this.addMonths(monthStartDate, 1);
      const monthEndDate = this.addDays(nextMonthStartDate, -1);

      const [weeklyReport, staticGuides, warningRecords] = await Promise.all([
        this.reportService.getWeeklyReport(userId, {
          weekStartDate: this.toDateString(weekStartDate),
          includeGuide: true,
        }),
        this.prisma.guide.findMany({
          where: {
            status: 'A',
            category: {
              in: ['H', 'W'],
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
        }),
        this.findMonthlyWarningRecords(
          userId,
          monthStartDate,
          nextMonthStartDate,
        ),
      ]);

      const healthGuideRows = staticGuides.filter(
        (guide) => guide.category === 'H',
      );
      const warningGuideRows = staticGuides.filter(
        (guide) => guide.category === 'W',
      );

      const patternGuides =
        weeklyReport.dataStatus === 'ENOUGH'
          ? weeklyReport.guides.map((guide) => ({
              guideId: guide.guideId,
              category: 'P' as const,
              title: guide.title,
              summary: guide.summary,
              matchedRuleCodes: guide.matchedRuleCodes,
            }))
          : [];

      const detectedFlags = this.detectWarningFlags(warningRecords);
      const warningDetected = detectedFlags.length > 0;

      return {
        sectionOrder: warningDetected
          ? ['WARNING', 'PATTERN', 'HEALTH']
          : ['PATTERN', 'HEALTH', 'WARNING'],
        patternGuideSection: {
          category: 'P',
          categoryLabel: '패턴 기반',
          sectionTitle: '내 패턴 기반',
          sectionDescription:
            '이번 주 기록을 바탕으로 맞춤 가이드를 보여드려요.',
          period: weeklyReport.period,
          dataStatus:
            weeklyReport.dataStatus === 'ENOUGH' ? 'AVAILABLE' : 'INSUFFICIENT',
          recordedDays: weeklyReport.recordStats.recordedDays,
          requiredDays: 3,
          notice:
            weeklyReport.dataStatus === 'ENOUGH'
              ? null
              : {
                  code: 'GUIDE_WEEKLY_RECORD_NOT_ENOUGH',
                  message:
                    '3일 이상 기록하면 내 패턴 기반 가이드를 볼 수 있어요.',
                },
          guides: patternGuides,
        },
        healthGuideSection: {
          category: 'H',
          categoryLabel: '장 건강',
          sectionTitle: '장 건강 기본 정보',
          sectionDescription:
            '장 건강과 배변 습관에 대한 기본 정보를 확인해보세요.',
          guides: healthGuideRows.map((guide) => ({
            guideId: guide.id,
            category: 'H' as const,
            title: guide.title,
            summary: guide.summary,
          })),
        },
        warningGuideSection: {
          category: 'W',
          categoryLabel: '주의 신호',
          sectionTitle: '주의 신호',
          sectionDescription: '다음 증상이 반복된다면 전문가 상담을 권장해요.',
          period: {
            type: 'MONTHLY',
            startDate: this.toDateString(monthStartDate),
            endDate: this.toDateString(monthEndDate),
          },
          highlighted: warningDetected,
          detectedFlags,
          guides: warningGuideRows.map((guide) => ({
            guideId: guide.id,
            category: 'W' as const,
            title: guide.title,
            summary: guide.summary,
          })),
        },
      };
    } catch {
      throw new BusinessException(
        GuideErrorCode.GUIDE_FETCH_FAILED,
        '가이드 화면 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 월간 위험 신호 판정에 필요한 컬럼만 조회

  private async findMonthlyWarningRecords(
    userId: bigint,
    monthStartDate: Date,
    nextMonthStartDate: Date,
  ): Promise<WarningRecordRow[]> {
    return this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: this.toKstBoundary(monthStartDate),
          lt: this.toKstBoundary(nextMonthStartDate),
        },
        OR: [
          {
            hasBowel: true,
            color: {
              in: ['R', 'N'],
            },
          },
          {
            stomach: 'L',
          },
        ],
      },
      select: {
        regDate: true,
        hasBowel: true,
        color: true,
        stomach: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }

  private detectWarningFlags(records: WarningRecordRow[]): WarningFlagDto[] {
    const flagMap = new Map<WarningFlagDto['flagCode'], WarningFlagDto>();

    // 오름차순으로 조회한 뒤 같은 신호가 반복되면 덮어쓰기
    // 최종적으로 가장 최근 감지일이 저장

    for (const record of records) {
      if (record.color === 'R') {
        flagMap.set('FLAG_BLOOD_RED', {
          flagCode: 'FLAG_BLOOD_RED',
          label: '붉은색 변이 기록되었어요.',
          detectedDate: toKstDateKey(record.regDate),
        });
      }

      if (record.color === 'N') {
        flagMap.set('FLAG_BLOOD_BLACK', {
          flagCode: 'FLAG_BLOOD_BLACK',
          label: '검은색 변이 기록되었어요.',
          detectedDate: toKstDateKey(record.regDate),
        });
      }

      if (record.stomach === 'L') {
        flagMap.set('FLAG_PAIN_SEVERE', {
          flagCode: 'FLAG_PAIN_SEVERE',
          label: '심한 복통이 기록되었어요.',
          detectedDate: toKstDateKey(record.regDate),
        });
      }
    }

    const flagOrder: WarningFlagDto['flagCode'][] = [
      'FLAG_BLOOD_RED',
      'FLAG_BLOOD_BLACK',
      'FLAG_PAIN_SEVERE',
    ];

    return flagOrder.flatMap((flagCode) => {
      const flag = flagMap.get(flagCode);
      return flag === undefined ? [] : [flag];
    });
  }

  private getCurrentMonthStartDate(): Date {
    const todayKey = getTodayKstDateKey();
    return this.parseDateString(`${todayKey.slice(0, 7)}-01`)!;
  }

  private toKstBoundary(calendarDate: Date): Date {
    return kstDayStart(this.toDateString(calendarDate));
  }

  private parseDateString(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match === null) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    return valid ? date : null;
  }

  private getTodayCalendarDate(): Date {
    return this.parseDateString(getTodayKstDateKey())!;
  }

  private getCurrentMonday(): Date {
    const today = this.getTodayCalendarDate();
    const dayOfWeek = today.getUTCDay();
    const difference = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    return this.addDays(today, difference);
  }

  private addDays(date: Date, days: number): Date {
    const copiedDate = new Date(date);
    copiedDate.setUTCDate(copiedDate.getUTCDate() + days);
    return copiedDate;
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
    );
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  // 가이드 상세조회 메인
  async getGuideDetail(
    userId: bigint,
    rawGuideId: string,
  ): Promise<GuideDetailResponseDto> {
    try {
      const guideId = this.parseGuideId(rawGuideId);
      const guide = await this.findGuideDetail(guideId);

      if (guide === null) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_CONTENT_NOT_FOUND,
          '요청한 가이드를 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      if (guide.status !== 'A') {
        throw new BusinessException(
          GuideErrorCode.GUIDE_CONTENT_INACTIVE,
          '현재 제공되지 않는 가이드입니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const common = {
        guideId: guide.id,
        title: guide.title,
        summary: guide.summary,
        source: guide.source,
        contents: this.mapGuideContents(guide.guideContents),
        advices: this.mapGuideAdvices(guide.guideAdvices),
      };

      if (guide.category === 'H') {
        const recommendedGuides = await this.findRecommendedHealthGuides(
          guide.id,
        );

        const response: HealthGuideDetailResponseDto = {
          ...common,
          category: 'H',
          categoryLabel: '장 건강',
          recommendedGuides,
          patternReason: null,
          warningAnalysis: null,
        };

        return response;
      }

      if (guide.category === 'P') {
        const patternReason = await this.buildPatternGuideReason(
          userId,
          guide.id,
        );

        const response: PatternGuideDetailResponseDto = {
          ...common,
          category: 'P',
          categoryLabel: '패턴 기반',
          recommendedGuides: [],
          patternReason,
          warningAnalysis: null,
        };

        return response;
      }

      if (guide.category === 'W') {
        const warningAnalysis = await this.buildWarningGuideAnalysis(userId);

        const response: WarningGuideDetailResponseDto = {
          ...common,
          category: 'W',
          categoryLabel: '주의 신호',
          recommendedGuides: [],
          patternReason: null,
          warningAnalysis,
        };

        return response;
      }

      throw new Error(`Unsupported guide category: ${guide.category}`);
    } catch (error) {
      if (
        error instanceof BusinessException &&
        error.getStatus() < INTERNAL_SERVER_ERROR_STATUS
      ) {
        throw error;
      }

      throw new BusinessException(
        GuideErrorCode.GUIDE_DETAIL_FETCH_FAILED,
        '가이드 상세 조회 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // 공통 DB조회
  private findGuideDetail(guideId: number): Promise<GuideDetailRow | null> {
    return this.prisma.guide.findUnique({
      where: {
        id: guideId,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        source: true,
        category: true,
        status: true,
        guideContents: {
          select: {
            id: true,
            subtitle: true,
            content: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
        guideAdvices: {
          select: {
            id: true,
            content: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }
  // 본문, 조언(강조표시) 반환
  private mapGuideContents(
    rows: GuideDetailRow['guideContents'],
  ): GuideContentItemDto[] {
    return rows.map((row, index) => ({
      contentId: row.id,
      order: index + 1,
      subtitle: row.subtitle,
      content: row.content,
    }));
  }

  private mapGuideAdvices(
    rows: GuideDetailRow['guideAdvices'],
  ): GuideAdviceItemDto[] {
    return rows.map((row, index) => ({
      adviceId: row.id,
      order: index + 1,
      content: row.content,
    }));
  }

  // 현재 가이드 제외 활성 장건강 추천
  private async findRecommendedHealthGuides(
    currentGuideId: number,
  ): Promise<RecommendedGuideDto[]> {
    const guides = await this.prisma.guide.findMany({
      where: {
        id: {
          not: currentGuideId,
        },
        category: 'H',
        status: 'A',
      },
      select: {
        id: true,
        title: true,
        summary: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return guides.map((guide) => ({
      guideId: guide.id,
      title: guide.title,
      summary: guide.summary,
    }));
  }

  private parseGuideId(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_ID,
        'guideId는 1 이상의 숫자여야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const guideId = Number(value);

    if (!Number.isSafeInteger(guideId) || guideId < 1) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_ID,
        'guideId는 1 이상의 숫자여야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return guideId;
  }
  // 패턴 가이드 이유
  private async buildPatternGuideReason(
    userId: bigint,
    guideId: number,
  ): Promise<PatternGuideReasonDto> {
    const binding = PATTERN_GUIDE_BINDINGS.find(
      (item) => item.guideId === guideId,
    );

    if (binding === undefined) {
      throw new Error(`Pattern guide binding not found: ${guideId}`);
    }
    const weekStartDate = this.getCurrentMonday();
    const weeklyReport = await this.reportService.getWeeklyReport(userId, {
      weekStartDate: this.toDateString(weekStartDate),
      includeGuide: false,
    });

    const boundRuleCodeSet = new Set<WeeklyRuleCode>(binding.ruleCodes);
    const matchedPatterns = weeklyReport.patternCards
      .filter((card) => boundRuleCodeSet.has(card.ruleCode))
      .map((card) => ({
        ruleCode: card.ruleCode,
        level: card.level,
        title: card.title,
        description: card.description,
        evidence: card.evidence ?? [],
      }));

    return {
      period: weeklyReport.period,
      recordStatus: {
        dataStatus: weeklyReport.dataStatus,
        recordedDays: weeklyReport.recordStats.recordedDays,
        requiredDays: weeklyReport.recordStats.requiredDays,
        completionScore: weeklyReport.recordStats.completionScore,
      },
      matched: matchedPatterns.length > 0,
      matchedRuleCodes: matchedPatterns.map((pattern) => pattern.ruleCode),
      matchedPatterns,
    };
  }

  //월간 기록 조회
  private async findWarningDetailRecords(
    userId: bigint,
    monthStartDate: Date,
    nextMonthStartDate: Date,
  ): Promise<WarningDetailRecordRow[]> {
    return this.prisma.boogleRecord.findMany({
      where: {
        userId,
        status: 'A',
        regDate: {
          gte: this.toKstBoundary(monthStartDate),
          lt: this.toKstBoundary(nextMonthStartDate),
        },
        OR: [
          {
            hasBowel: true,
            color: {
              in: ['R', 'N'],
            },
          },
          {
            stomach: 'L',
          },
        ],
      },
      select: {
        id: true,
        regDate: true,
        color: true,
        stomach: true,
      },
      orderBy: {
        regDate: 'asc',
      },
    });
  }

  // 주의 신호 생성
  private detectWarningDetailFlags(
    records: WarningDetailRecordRow[],
  ): WarningDetailFlagDto[] {
    const flagMap = new Map<
      WarningDetailFlagDto['flagCode'],
      WarningDetailFlagDto
    >();

    for (const record of records) {
      if (record.color === 'R') {
        flagMap.set('FLAG_BLOOD_RED', {
          flagCode: 'FLAG_BLOOD_RED',
          label: '붉은색 변 기록',
          detectedDate: toKstDateKey(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }

      if (record.color === 'N') {
        flagMap.set('FLAG_BLOOD_BLACK', {
          flagCode: 'FLAG_BLOOD_BLACK',
          label: '검은색 변 기록',
          detectedDate: toKstDateKey(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }

      if (record.stomach === 'L') {
        flagMap.set('FLAG_PAIN_SEVERE', {
          flagCode: 'FLAG_PAIN_SEVERE',
          label: '심한 복통 기록',
          detectedDate: toKstDateKey(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }
    }

    return [...flagMap.values()];
  }

  private async buildWarningGuideAnalysis(
    userId: bigint,
  ): Promise<WarningGuideAnalysisDto> {
    const monthStartDate = this.getCurrentMonthStartDate();
    const nextMonthStartDate = this.addMonths(monthStartDate, 1);
    const monthEndDate = this.addDays(nextMonthStartDate, -1);
    const records = await this.findWarningDetailRecords(
      userId,
      monthStartDate,
      nextMonthStartDate,
    );
    const detectedFlags = this.detectWarningDetailFlags(records);

    return {
      period: {
        type: 'MONTHLY',
        startDate: this.toDateString(monthStartDate),
        endDate: this.toDateString(monthEndDate),
      },
      matched: detectedFlags.length > 0,
      detectedFlags,
    };
  }

  // 피드백 등록
  async createGuideFeedback(
    userId: bigint,
    rawGuideId: string,
    body: GuideFeedbackRequestDto,
  ): Promise<CreateGuideFeedbackResponseDto> {
    try {
      const guideId = this.parseGuideId(rawGuideId);

      const feedback = this.parseGuideFeedback(body.feedback);

      await this.assertActiveGuide(guideId);

      const existingFeedback = await this.prisma.guideFeedback.findUnique({
        where: {
          userId_guideId: {
            userId,
            guideId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingFeedback !== null) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_FEEDBACK_ALREADY_EXISTS,
          '이미 해당 가이드에 피드백을 등록했습니다.',
          HttpStatus.CONFLICT,
        );
      }

      const createdFeedback = await this.prisma.guideFeedback.create({
        data: {
          userId,
          guideId,
          feedback,
        },
        select: {
          id: true,
          guideId: true,
          feedback: true,
          regDate: true,
        },
      });

      return {
        guideFeedbackId: createdFeedback.id.toString(),
        guideId: createdFeedback.guideId,
        feedback: this.parseGuideFeedback(createdFeedback.feedback),
        regDate: createdFeedback.regDate.toISOString(),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      // 동시 요청으로 unique 제약이 발생한 경우에도 409로

      if (this.isPrismaErrorCode(error, 'P2002')) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_FEEDBACK_ALREADY_EXISTS,
          '이미 해당 가이드에 피드백을 등록했습니다.',
          HttpStatus.CONFLICT,
        );
      }

      throw new BusinessException(
        GuideErrorCode.GUIDE_FEEDBACK_CREATE_FAILED,
        '가이드 피드백 등록 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 피드백 수정
  async updateGuideFeedback(
    userId: bigint,
    rawGuideId: string,
    body: GuideFeedbackRequestDto,
  ): Promise<UpdateGuideFeedbackResponseDto> {
    try {
      const guideId = this.parseGuideId(rawGuideId);

      const feedback = this.parseGuideFeedback(body.feedback);

      await this.assertActiveGuide(guideId);

      const existingFeedback = await this.prisma.guideFeedback.findUnique({
        where: {
          userId_guideId: {
            userId,
            guideId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingFeedback === null) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_FEEDBACK_NOT_FOUND,
          '수정할 가이드 피드백을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const updatedAt = new Date();

      const updatedFeedback = await this.prisma.guideFeedback.update({
        where: {
          id: existingFeedback.id,
        },
        data: {
          feedback,
          updateDate: updatedAt,
        },
        select: {
          id: true,
          guideId: true,
          feedback: true,
          regDate: true,
          updateDate: true,
        },
      });

      if (updatedFeedback.updateDate === null) {
        throw new Error('updateDate was not saved');
      }

      return {
        guideFeedbackId: updatedFeedback.id.toString(),
        guideId: updatedFeedback.guideId,
        feedback: this.parseGuideFeedback(updatedFeedback.feedback),
        regDate: updatedFeedback.regDate.toISOString(),
        updatedAt: updatedFeedback.updateDate.toISOString(),
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw new BusinessException(
        GuideErrorCode.GUIDE_FEEDBACK_UPDATE_FAILED,
        '가이드 피드백 수정 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 피드백 삭제
  async deleteGuideFeedback(
    userId: bigint,
    rawGuideId: string,
  ): Promise<DeleteGuideFeedbackResponseDto> {
    try {
      const guideId = this.parseGuideId(rawGuideId);

      await this.assertActiveGuide(guideId);

      const existingFeedback = await this.prisma.guideFeedback.findUnique({
        where: {
          userId_guideId: {
            userId,
            guideId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingFeedback === null) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_FEEDBACK_NOT_FOUND,
          '삭제할 가이드 피드백을 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const deletedFeedback = await this.prisma.guideFeedback.delete({
        where: {
          id: existingFeedback.id,
        },
        select: {
          id: true,
          guideId: true,
        },
      });

      return {
        guideFeedbackId: deletedFeedback.id.toString(),
        guideId: deletedFeedback.guideId,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      throw new BusinessException(
        GuideErrorCode.GUIDE_FEEDBACK_DELETE_FAILED,
        '가이드 피드백 삭제 중 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 피드백 공통함수
  private parseGuideFeedback(value: unknown): GuideFeedbackStatus {
    if (value === 'G' || value === 'A' || value === 'N') {
      return value;
    }

    throw new BusinessException(
      GuideErrorCode.GUIDE_INVALID_FEEDBACK,
      'feedback은 G, A, N 중 하나여야 합니다.',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async assertActiveGuide(guideId: number): Promise<void> {
    const guide = await this.prisma.guide.findUnique({
      where: {
        id: guideId,
      },
      select: {
        status: true,
      },
    });

    if (guide === null) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_CONTENT_NOT_FOUND,
        '요청한 가이드를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (guide.status !== 'A') {
      throw new BusinessException(
        GuideErrorCode.GUIDE_CONTENT_INACTIVE,
        '현재 제공되지 않는 가이드입니다.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private isPrismaErrorCode(error: unknown, expectedCode: string): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return (error as { code?: unknown }).code === expectedCode;
  }
}
