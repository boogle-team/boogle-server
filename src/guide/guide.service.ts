import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions/business.exception';
import { PrismaService } from '@/prisma/prisma.service';
import { ReportService } from '@/report/report.service';
import type { WeeklyReportResponseDto } from '@/report/dto/weekly-report-response.dto';
import type { GetGuideScreenQueryDto } from './dto/get-guide-screen-query.dto';
import type {
  GuideFeedbackStatus,
  GuideScreenResponseDto,
  WarningFlagDto,
} from './dto/guide-screen-response.dto';
import { GuideErrorCode } from './guide-error-code.enum';
import type { GetGuideDetailQueryDto } from './dto/get-guide-detail-query.dto';
import type {
  GuideDetailResponseDto,
  GuideDetailRuleDto,
  PatternGuideDetailResponseDto,
  PatternGuideEvidenceDto,
  PatternRelatedRecordsDto,
  WarningDetailFlagDto,
  WarningGuideDetailResponseDto,
} from './dto/guide-detail-response.dto';
import type { GuideFeedbackRequestDto } from './dto/guide-feedback-request.dto';
import type {
  CreateGuideFeedbackResponseDto,
  DeleteGuideFeedbackResponseDto,
  UpdateGuideFeedbackResponseDto,
} from './dto/guide-feedback-response.dto';
import type {
  WarningRecordRow,
  GuideContentDetailRow,
  WarningDetailRecordRow,
} from './dto/guide-record.dto';

const GUIDE_SCREEN_PASSTHROUGH_ERROR_CODES: ReadonlySet<string> =
  new Set<string>([
    GuideErrorCode.GUIDE_INVALID_WEEK_FORMAT,
    GuideErrorCode.GUIDE_INVALID_MONTH_FORMAT,
  ]);

const INTERNAL_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

@Injectable()
export class GuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,
  ) {}

  async getGuideScreen(
    userId: bigint,
    query: GetGuideScreenQueryDto,
  ): Promise<GuideScreenResponseDto> {
    try {
      const includeFeedback = query.includeFeedback ?? true;
      const weekStartDate = this.resolveWeekStartDate(query.weekStartDate);
      const monthStartDate = this.resolveMonthStartDate(query.monthStartDate);
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
      const allGuideIds = [
        ...weeklyReport.guides.map((guide) => guide.guideId),
        ...staticGuides.map((guide) => guide.id),
      ];
      const feedbackMap = await this.findFeedbackMap(
        userId,
        allGuideIds,
        includeFeedback,
      );

      const patternGuides =
        weeklyReport.dataStatus === 'ENOUGH'
          ? weeklyReport.guides.map((guide) => ({
              guideId: guide.guideId,
              category: 'P' as const,
              title: guide.title,
              summary: guide.summary,
              matchedRuleCodes: guide.matchedRuleCodes,
              feedbackStatus: feedbackMap.get(guide.guideId) ?? null,
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
          sectionTitle: '내 패턴 기반 가이드',
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
            feedbackStatus: feedbackMap.get(guide.id) ?? null,
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
            feedbackStatus: feedbackMap.get(guide.id) ?? null,
          })),
        },
      };
    } catch (error) {
      if (
        error instanceof BusinessException &&
        GUIDE_SCREEN_PASSTHROUGH_ERROR_CODES.has(error.errorCode)
      ) {
        throw error;
      }

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
        hasBowel: true,
        regDate: {
          gte: monthStartDate,
          lt: nextMonthStartDate,
        },
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

  private async findFeedbackMap(
    userId: bigint,
    guideIds: number[],
    includeFeedback: boolean,
  ): Promise<Map<number, GuideFeedbackStatus>> {
    if (!includeFeedback || guideIds.length === 0) {
      return new Map();
    }

    const uniqueGuideIds = [...new Set(guideIds)];

    const feedbacks = await this.prisma.guideFeedback.findMany({
      where: {
        userId,
        guideId: {
          in: uniqueGuideIds,
        },
      },
      select: {
        guideId: true,
        feedback: true,
      },
    });

    const feedbackMap = new Map<number, GuideFeedbackStatus>();

    for (const feedback of feedbacks) {
      if (this.isGuideFeedbackStatus(feedback.feedback)) {
        feedbackMap.set(feedback.guideId, feedback.feedback);
      }
    }

    return feedbackMap;
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
          detectedDate: this.toDateString(record.regDate),
        });
      }

      if (record.color === 'N') {
        flagMap.set('FLAG_BLOOD_BLACK', {
          flagCode: 'FLAG_BLOOD_BLACK',
          label: '검은색 변이 기록되었어요.',
          detectedDate: this.toDateString(record.regDate),
        });
      }

      if (record.stomach === 'L') {
        flagMap.set('FLAG_PAIN_SEVERE', {
          flagCode: 'FLAG_PAIN_SEVERE',
          label: '심한 복통이 기록되었어요.',
          detectedDate: this.toDateString(record.regDate),
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

  private isGuideFeedbackStatus(value: string): value is GuideFeedbackStatus {
    return value === 'G' || value === 'A' || value === 'N';
  }

  private resolveWeekStartDate(value?: string): Date {
    if (value === undefined || value.trim() === '') {
      return this.getCurrentMonday();
    }

    const parsedDate = this.parseDateString(value);

    if (parsedDate === null) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_WEEK_FORMAT,
        'weekStartDate는 YYYY-MM-DD 형식이어야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
  }

  private resolveMonthStartDate(value?: string): Date {
    if (value === undefined || value.trim() === '') {
      const now = new Date();

      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    }

    const parsedDate = this.parseDateString(value);

    if (parsedDate === null || parsedDate.getUTCDate() !== 1) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_MONTH_FORMAT,
        'monthStartDate는 YYYY-MM-01 형식이어야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
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

  private getCurrentMonday(): Date {
    const now = new Date();

    const today = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

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
    query: GetGuideDetailQueryDto,
  ): Promise<GuideDetailResponseDto> {
    try {
      const guideId = this.parseGuideId(rawGuideId);

      // status 조건을 여기서 A로 제한하지 않는다
      // 조회 후 없는 콘텐츠와 비활성 콘텐츠를 구분하기 위함

      const guideContent = await this.findGuideContentDetail(guideId);

      if (guideContent === null) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_CONTENT_NOT_FOUND,
          '요청한 가이드 콘텐츠를 찾을 수 없습니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      if (guideContent.status !== 'A') {
        throw new BusinessException(
          GuideErrorCode.GUIDE_CONTENT_INACTIVE,
          '현재 제공되지 않는 가이드 콘텐츠입니다.',
          HttpStatus.NOT_FOUND,
        );
      }

      const feedbackStatus = await this.findGuideFeedback(userId, guideId);

      if (guideContent.category === 'H') {
        return {
          guideId: guideContent.id,
          category: 'H',
          categoryLabel: '장 건강',
          title: guideContent.title,
          content: guideContent.content,
          period: null,
          rule: null,
          matchedEvidence: null,
          relatedRecords: null,
          feedbackStatus,
        };
      }

      if (guideContent.category === 'P') {
        return this.buildPatternGuideDetail(
          userId,
          guideContent,
          feedbackStatus,
          query,
        );
      }

      if (guideContent.category === 'W') {
        return this.buildWarningGuideDetail(
          userId,
          guideContent,
          feedbackStatus,
          query,
        );
      }
      // 활성 콘텐츠인데 P/H/W가 아니라면 DB 데이터 무결성 오류

      throw new Error(`Unsupported guide category: ${guideContent.category}`);
    } catch (error) {
      // 사용자의 잘못된 요청이나 콘텐츠 상태 오류는 그대로 전달
      // ReportService 내부 500 오류 등은 G102 전용 오류로 변환

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
  private async findGuideContentDetail(
    guideId: number,
  ): Promise<GuideContentDetailRow | null> {
    return this.prisma.guideContent.findUnique({
      where: {
        id: guideId,
      },
      select: {
        id: true,
        category: true,
        title: true,
        content: true,
        status: true,
        guideRules: {
          select: {
            ruleCode: true,
            condition: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });
  }

  private async findGuideFeedback(
    userId: bigint,
    guideId: number,
  ): Promise<'G' | 'A' | 'N' | null> {
    const feedback = await this.prisma.guideFeedback.findFirst({
      where: {
        userId,
        guideId,
      },
      select: {
        feedback: true,
      },
      orderBy: {
        regDate: 'desc',
      },
    });

    if (
      feedback?.feedback === 'G' ||
      feedback?.feedback === 'A' ||
      feedback?.feedback === 'N'
    ) {
      return feedback.feedback;
    }

    return null;
  }

  private parseGuideId(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_ID,
        'guideContentId는 1 이상의 숫자여야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const guideId = Number(value);

    if (!Number.isSafeInteger(guideId) || guideId < 1) {
      throw new BusinessException(
        GuideErrorCode.GUIDE_INVALID_ID,
        'guideContentId는 1 이상의 숫자여야 합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return guideId;
  }
  // 패턴 가이드 상세
  private async buildPatternGuideDetail(
    userId: bigint,
    guideContent: GuideContentDetailRow,
    feedbackStatus: 'G' | 'A' | 'N' | null,
    query: GetGuideDetailQueryDto,
  ): Promise<PatternGuideDetailResponseDto> {
    const weekStartDate = this.resolveWeekStartDate(query.weekStartDate);

    const weeklyReport = await this.reportService.getWeeklyReport(userId, {
      weekStartDate: this.toDateString(weekStartDate),
      includeGuide: false,
    });

    const matchedRuleCodeSet = new Set(
      weeklyReport.patternCards.map((card) => card.ruleCode),
    );

    const selectedRule = this.selectPatternRule(
      guideContent.guideRules,
      query.ruleCode,
      matchedRuleCodeSet,
    );

    const matchedCard =
      selectedRule === null
        ? undefined
        : weeklyReport.patternCards.find(
            (card) => card.ruleCode === selectedRule.ruleCode,
          );

    const matchedEvidence =
      selectedRule === null
        ? null
        : this.buildPatternDetailEvidence(
            selectedRule,
            weeklyReport,
            matchedCard?.description,
          );

    return {
      guideId: guideContent.id,
      category: 'P',
      categoryLabel: '패턴 기반',
      title: guideContent.title,
      content: guideContent.content,
      period: weeklyReport.period,
      rule: selectedRule,
      matchedEvidence,
      relatedRecords: this.buildPatternRelatedRecords(weeklyReport),
      feedbackStatus,
    };
  }
  // 패턴 규칙 선택
  private selectPatternRule(
    rules: GuideContentDetailRow['guideRules'],
    requestedRuleCode: string | undefined,
    matchedRuleCodeSet: Set<string>,
  ): GuideDetailRuleDto | null {
    const validRules = rules
      .filter(
        (
          rule,
        ): rule is {
          ruleCode: string;
          condition: string | null;
        } => rule.ruleCode !== null,
      )
      .map((rule) => ({
        ruleCode: rule.ruleCode,
        condition: rule.condition,
      }));

    if (requestedRuleCode !== undefined) {
      const requestedRule = validRules.find(
        (rule) => rule.ruleCode === requestedRuleCode,
      );

      if (requestedRule === undefined) {
        throw new BusinessException(
          GuideErrorCode.GUIDE_RULE_NOT_FOUND,
          '해당 가이드에 연결된 규칙을 찾을 수 없습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return requestedRule;
    }

    // 현재 주간 기록에서 실제로 감지된 규칙을 우선 선택

    const matchedRule = validRules.find((rule) =>
      matchedRuleCodeSet.has(rule.ruleCode),
    );

    return matchedRule ?? validRules[0] ?? null;
  }
  // 관련 기록 요약
  private buildPatternRelatedRecords(
    report: WeeklyReportResponseDto,
  ): PatternRelatedRecordsDto {
    const hardStoolCount =
      report.stoolDistribution.find((item) => item.stoolSimple === 'H')
        ?.count ?? 0;

    const looseStoolCount =
      report.stoolDistribution.find((item) => item.stoolSimple === 'T')
        ?.count ?? 0;

    return {
      totalRecordedDays: report.recordStats.recordedDays,
      bowelCount: report.summary?.bowelCount ?? 0,
      hardStoolCount,
      looseStoolCount,
      lowSleepDays: report.lifeFactorStats?.lowSleep.count ?? 0,
      highStressDays: report.lifeFactorStats?.highStress.count ?? 0,
      lowWaterDays: report.lifeFactorStats?.lowWater.count ?? 0,
      highCaffeineDays: report.lifeFactorStats?.highCaffeine.count ?? 0,
    };
  }

  // 패턴 근거 생성
  private buildPatternDetailEvidence(
    rule: GuideDetailRuleDto,
    report: WeeklyReportResponseDto,
    matchedDescription?: string,
  ): PatternGuideEvidenceDto | null {
    const matched = report.patternCards.some(
      (card) => card.ruleCode === rule.ruleCode,
    );

    const description =
      matchedDescription ??
      '현재 조회한 주간 기록에서는 해당 패턴이 감지되지 않았어요.';

    if (
      rule.ruleCode === 'LOW_BOWEL_COUNT' ||
      rule.ruleCode === 'HIGH_BOWEL_COUNT'
    ) {
      return {
        matched,
        sourceTable: 'weekly_record',
        sourceField: 'bowelCount',
        condition:
          rule.condition ??
          (rule.ruleCode === 'LOW_BOWEL_COUNT'
            ? 'bowelCount <= 2'
            : 'bowelCount >= 10'),
        count: report.summary?.bowelCount ?? 0,
        description,
      };
    }

    if (rule.ruleCode === 'CONSTIPATION_PATTERN') {
      return {
        matched,
        sourceTable: 'boogle_record',
        sourceField: 'stoolSimple',
        condition: rule.condition ?? 'stoolSimple = H',
        count:
          report.stoolDistribution.find((item) => item.stoolSimple === 'H')
            ?.count ?? 0,
        description,
      };
    }

    if (rule.ruleCode === 'LOOSE_STOOL_PATTERN') {
      return {
        matched,
        sourceTable: 'boogle_record',
        sourceField: 'stoolSimple',
        condition: rule.condition ?? 'stoolSimple = T',
        count:
          report.stoolDistribution.find((item) => item.stoolSimple === 'T')
            ?.count ?? 0,
        description,
      };
    }

    const lifeFactorStats = report.lifeFactorStats;

    if (lifeFactorStats === null) {
      return null;
    }

    const lifeRuleMap = {
      LOW_SLEEP: {
        sourceField: 'sleepTime',
        condition: 'sleepTime = 1',
        count: lifeFactorStats.lowSleep.count,
      },
      HIGH_STRESS: {
        sourceField: 'stress',
        condition: 'stress = H',
        count: lifeFactorStats.highStress.count,
      },
      LOW_WATER: {
        sourceField: 'water',
        condition: 'water = L',
        count: lifeFactorStats.lowWater.count,
      },
      HIGH_CAFFEINE: {
        sourceField: 'caffeine',
        condition: 'caffeine = M',
        count: lifeFactorStats.highCaffeine.count,
      },
    } as const;

    const evidence = lifeRuleMap[rule.ruleCode as keyof typeof lifeRuleMap];

    if (evidence === undefined) {
      return null;
    }

    return {
      matched,
      sourceTable: 'life_record',
      sourceField: evidence.sourceField,
      condition: rule.condition ?? evidence.condition,
      count: evidence.count,
      description,
    };
  }
  // 주의신호 상세
  private async buildWarningGuideDetail(
    userId: bigint,
    guideContent: GuideContentDetailRow,
    feedbackStatus: 'G' | 'A' | 'N' | null,
    query: GetGuideDetailQueryDto,
  ): Promise<WarningGuideDetailResponseDto> {
    const monthStartDate = this.resolveMonthStartDate(query.monthStartDate);

    const nextMonthStartDate = this.addMonths(monthStartDate, 1);

    const monthEndDate = this.addDays(nextMonthStartDate, -1);

    const records = await this.findWarningDetailRecords(
      userId,
      monthStartDate,
      nextMonthStartDate,
    );

    const detectedFlags = this.detectWarningDetailFlags(records);

    return {
      guideId: guideContent.id,
      category: 'W',
      categoryLabel: '주의 신호',
      title: guideContent.title,
      content: guideContent.content,
      period: {
        type: 'MONTHLY',
        startDate: this.toDateString(monthStartDate),
        endDate: this.toDateString(monthEndDate),
      },
      rule: null,
      matchedEvidence: {
        matched: detectedFlags.length > 0,
        detectedFlags,
      },
      relatedRecords: null,
      feedbackStatus,
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
        hasBowel: true,
        regDate: {
          gte: monthStartDate,
          lt: nextMonthStartDate,
        },
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
          detectedDate: this.toDateString(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }

      if (record.color === 'N') {
        flagMap.set('FLAG_BLOOD_BLACK', {
          flagCode: 'FLAG_BLOOD_BLACK',
          label: '검은색 변 기록',
          detectedDate: this.toDateString(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }

      if (record.stomach === 'L') {
        flagMap.set('FLAG_PAIN_SEVERE', {
          flagCode: 'FLAG_PAIN_SEVERE',
          label: '심한 복통 기록',
          detectedDate: this.toDateString(record.regDate),
          sourceRecordId: record.id.toString(),
        });
      }
    }

    return [...flagMap.values()];
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
