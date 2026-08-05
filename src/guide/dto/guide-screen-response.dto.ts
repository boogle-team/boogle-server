import { ApiProperty } from '@nestjs/swagger';
import {
  type WeeklyRuleCode,
  WEEKLY_RULE_CODE,
  WEEKLY_RULE_CODES,
} from '@/report/pattern/weekly-pattern.constants';

export type GuideCategory = 'P' | 'H' | 'W';
export type GuideFeedbackStatus = 'G' | 'A' | 'N';
export type GuideSectionKey = 'PATTERN' | 'HEALTH' | 'WARNING';
export type PatternGuideDataStatus = 'AVAILABLE' | 'INSUFFICIENT';

export class GuidePeriodDto {
  @ApiProperty({
    enum: ['WEEKLY'],
    example: 'WEEKLY',
    description: '가이드 분석 기간 단위',
  })
  type!: 'WEEKLY';

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
}

export class PatternGuideDto {
  @ApiProperty({
    type: Number,
    example: 101,
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
    example: 'G',
    description:
      '현재 주에 사용자가 남긴 피드백. 피드백을 남기지 않았으면 null',
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
    enum: ['내 패턴 기반'],
    example: '내 패턴 기반',
    description: '패턴 기반 가이드 섹션 제목',
  })
  sectionTitle!: '내 패턴 기반';

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
    enum: ['장 건강 기본 정보'],
    example: '장 건강 기본 정보',
    description: '장 건강 기본 정보 가이드 섹션 제목',
  })
  sectionTitle!: '장 건강 기본 정보';

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
    enum: ['주의 신호'],
    example: '주의 신호',
    description: '주의 신호 가이드 섹션 제목',
  })
  sectionTitle!: '주의 신호';

  @ApiProperty({
    type: String,
    example: '다음 증상이 반복된다면 전문가 상담을 권장해요.',
  })
  sectionDescription!: string;

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
    example: ['PATTERN', 'HEALTH', 'WARNING'],
    description:
      '프론트엔드 가이드 섹션 표시 순서. 패턴 기반, 장 건강, 주의 신호 순으로 고정',
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
