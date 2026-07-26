import { ApiProperty } from '@nestjs/swagger';
import {
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from '@/report/pattern/weekly-pattern.constants';

const WEEKLY_RULE_CODES = Object.values(WEEKLY_RULE_CODE);

export type GuideCategory = 'P' | 'H' | 'W';
export type GuideFeedbackStatus = 'G' | 'A' | 'N';
export type GuideSectionKey = 'PATTERN' | 'HEALTH' | 'WARNING';
export type PatternGuideDataStatus = 'AVAILABLE' | 'INSUFFICIENT';

export class GuidePeriodDto {
  @ApiProperty({
    enum: ['WEEKLY', 'MONTHLY'],
    example: 'WEEKLY',
    description: '가이드 분석 기간 단위',
  })
  type!: 'WEEKLY' | 'MONTHLY';

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-20',
    description: '가이드 분석 기간 시작일',
  })
  startDate!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-26',
    description: '가이드 분석 기간 종료일',
  })
  endDate!: string;
}

export class GuideNoticeDto {
  @ApiProperty({
    type: String,
    example: 'GUIDE_WEEKLY_RECORD_NOT_ENOUGH',
    description: '가이드 화면 안내 코드',
  })
  code!: string;

  @ApiProperty({
    type: String,
    example: '3일 이상 기록하면 내 패턴 기반 가이드를 볼 수 있어요.',
    description: '사용자에게 표시할 안내 메시지',
  })
  message!: string;
}

export class GuideCardDto {
  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: '가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    enum: ['P', 'H', 'W'],
    example: 'H',
    description: '가이드 카테고리. P 패턴 기반, H 장 건강, W 주의 신호',
  })
  category!: GuideCategory;

  @ApiProperty({
    type: String,
    example: '정상 배변 횟수는?',
    description: '가이드 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '주 3회에서 하루 3회까지 다양하며 개인마다 다를 수 있어요.',
    description: '가이드 요약',
  })
  summary!: string;

  @ApiProperty({
    enum: ['G', 'A', 'N'],
    nullable: true,
    example: null,
    description:
      '가이드 피드백. G 도움됨, A 이미 알고 있음, N 잘 모르겠음. 피드백이 없거나 includeFeedback=false이면 null',
  })
  feedbackStatus!: GuideFeedbackStatus | null;
}

export class MatchedEvidenceDto {
  @ApiProperty({
    enum: ['weekly_record', 'boogle_record', 'life_record'],
    example: 'boogle_record',
    description: '패턴 근거 데이터의 출처',
  })
  sourceTable!: 'weekly_record' | 'boogle_record' | 'life_record';

  @ApiProperty({
    type: String,
    example: 'stoolSimple',
    description: '패턴 판정에 사용한 필드',
  })
  sourceField!: string;

  @ApiProperty({
    type: String,
    example: 'stoolSimple = H',
    description: '패턴 판정 조건',
  })
  condition!: string;

  @ApiProperty({
    type: Number,
    example: 3,
    minimum: 0,
    description: '조건을 만족한 기록 수',
  })
  count!: number;
}

export class PatternGuideDto {
  @ApiProperty({
    type: Number,
    example: 4,
    minimum: 1,
    description: '패턴에 연결된 가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    enum: ['P'],
    example: 'P',
    description: '패턴 기반 가이드 카테고리',
  })
  category!: 'P';

  @ApiProperty({
    type: String,
    example: '수분과 딱딱한 변의 관계',
    description: '패턴 기반 가이드 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '수분이 부족했던 날 딱딱한 변이 함께 나타났어요.',
    description: '패턴 기반 가이드 요약',
  })
  summary!: string;

  @ApiProperty({
    enum: WEEKLY_RULE_CODES,
    isArray: true,
    example: [
      WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY,
      WEEKLY_RULE_CODE.LOW_WATER_WITH_HARD_STOOL,
    ],
    description: '이 가이드에 매칭된 주간 패턴 rule code',
  })
  matchedRuleCodes!: WeeklyRuleCode[];

  @ApiProperty({
    enum: ['G', 'A', 'N'],
    nullable: true,
    example: null,
    description:
      '가이드 피드백. 피드백이 없거나 includeFeedback=false이면 null',
  })
  feedbackStatus!: GuideFeedbackStatus | null;
}

export class PatternGuideSectionDto {
  @ApiProperty({
    enum: ['P'],
    example: 'P',
  })
  category!: 'P';

  @ApiProperty({
    enum: ['패턴 기반'],
    example: '패턴 기반',
  })
  categoryLabel!: '패턴 기반';

  @ApiProperty({
    type: String,
    example: '내 패턴 기반 가이드',
  })
  sectionTitle!: string;

  @ApiProperty({
    type: String,
    example: '이번 주 기록을 바탕으로 맞춤 가이드를 보여드려요.',
  })
  sectionDescription!: string;

  @ApiProperty({
    type: GuidePeriodDto,
    description: '패턴 가이드 판단에 사용한 주간 기간',
  })
  period!: GuidePeriodDto;

  @ApiProperty({
    enum: ['AVAILABLE', 'INSUFFICIENT'],
    example: 'AVAILABLE',
    description: '패턴 가이드 제공 가능 여부',
  })
  dataStatus!: PatternGuideDataStatus;

  @ApiProperty({
    type: Number,
    example: 5,
    minimum: 0,
    description: '해당 주의 통합 기록일 수',
  })
  recordedDays!: number;

  @ApiProperty({
    type: Number,
    example: 3,
    minimum: 0,
    description: '패턴 기반 가이드 제공에 필요한 최소 통합 기록일 수',
  })
  requiredDays!: number;

  @ApiProperty({
    type: GuideNoticeDto,
    nullable: true,
    description: '기록이 충분하면 null',
  })
  notice!: GuideNoticeDto | null;

  @ApiProperty({
    type: [PatternGuideDto],
    description: '감지 패턴에 연결된 가이드. 기록이 부족하면 빈 배열',
  })
  guides!: PatternGuideDto[];
}

export class HealthGuideSectionDto {
  @ApiProperty({
    enum: ['H'],
    example: 'H',
  })
  category!: 'H';

  @ApiProperty({
    enum: ['장 건강'],
    example: '장 건강',
  })
  categoryLabel!: '장 건강';

  @ApiProperty({
    type: String,
    example: '장 건강 기본 정보',
  })
  sectionTitle!: string;

  @ApiProperty({
    type: String,
    example: '장 건강과 배변 습관에 대한 기본 정보를 확인해보세요.',
  })
  sectionDescription!: string;

  @ApiProperty({
    type: [GuideCardDto],
    description: '활성 상태인 모든 장 건강 가이드',
  })
  guides!: GuideCardDto[];
}

export class WarningFlagDto {
  @ApiProperty({
    enum: ['FLAG_BLOOD_RED', 'FLAG_BLOOD_BLACK', 'FLAG_PAIN_SEVERE'],
    example: 'FLAG_BLOOD_RED',
    description: '감지된 주의 신호 코드',
  })
  flagCode!: 'FLAG_BLOOD_RED' | 'FLAG_BLOOD_BLACK' | 'FLAG_PAIN_SEVERE';

  @ApiProperty({
    type: String,
    example: '붉은색 변이 기록되었어요.',
    description: '주의 신호 표시 문구',
  })
  label!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-23',
    description: '해당 주의 신호가 마지막으로 감지된 KST 날짜',
  })
  detectedDate!: string;
}

export class WarningGuideSectionDto {
  @ApiProperty({
    enum: ['W'],
    example: 'W',
  })
  category!: 'W';

  @ApiProperty({
    enum: ['주의 신호'],
    example: '주의 신호',
  })
  categoryLabel!: '주의 신호';

  @ApiProperty({
    type: String,
    example: '주의 신호',
  })
  sectionTitle!: string;

  @ApiProperty({
    type: String,
    example: '다음 증상이 반복된다면 전문가 상담을 권장해요.',
  })
  sectionDescription!: string;

  @ApiProperty({
    type: GuidePeriodDto,
    description: '주의 신호 감지에 사용한 월간 기간',
  })
  period!: GuidePeriodDto;

  @ApiProperty({
    type: Boolean,
    example: true,
    description:
      '월간 기간에서 혈변, 흑변 또는 심한 복통이 하나 이상 감지됐는지 여부',
  })
  highlighted!: boolean;

  @ApiProperty({
    type: [WarningFlagDto],
    description: '감지된 주의 신호. 감지되지 않으면 빈 배열',
  })
  detectedFlags!: WarningFlagDto[];

  @ApiProperty({
    type: [GuideCardDto],
    description: '활성 상태인 모든 주의 신호 가이드',
  })
  guides!: GuideCardDto[];
}

export class GuideScreenResponseDto {
  @ApiProperty({
    enum: ['PATTERN', 'HEALTH', 'WARNING'],
    isArray: true,
    example: ['WARNING', 'PATTERN', 'HEALTH'],
    description:
      '프론트엔드 가이드 섹션 표시 순서. 주의 신호가 감지되면 WARNING이 첫 번째',
  })
  sectionOrder!: GuideSectionKey[];

  @ApiProperty({
    type: PatternGuideSectionDto,
  })
  patternGuideSection!: PatternGuideSectionDto;

  @ApiProperty({
    type: HealthGuideSectionDto,
  })
  healthGuideSection!: HealthGuideSectionDto;

  @ApiProperty({
    type: WarningGuideSectionDto,
  })
  warningGuideSection!: WarningGuideSectionDto;
}
