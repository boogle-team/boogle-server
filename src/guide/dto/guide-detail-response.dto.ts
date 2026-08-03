import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WEEKLY_RULE_CODE,
  WEEKLY_RULE_CODES,
} from '@/report/pattern/weekly-pattern.constants';
import type { WeeklyRuleCode } from '@/report/pattern/weekly-pattern.constants';
import {
  GuidePeriodDto,
  GuideFeedbackStatus,
} from './guide-screen-response.dto';

export class GuideContentItemDto {
  @ApiProperty({
    type: Number,
    example: 11,
    minimum: 1,
    description: '가이드 본문 ID',
  })
  contentId!: number;

  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: '가이드 본문 표시 순서',
  })
  order!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '정상 배변 횟수의 범위',
    description: '가이드 본문 소제목. 소제목이 없으면 null',
  })
  subtitle!: string | null;

  @ApiProperty({
    type: String,
    example: '정상 배변 횟수는 개인마다 다를 수 있습니다.',
    description: '가이드 본문 내용',
  })
  content!: string;
}

export class GuideAdviceItemDto {
  @ApiProperty({
    type: Number,
    example: 21,
    minimum: 1,
    description: '가이드 실천 조언 ID',
  })
  adviceId!: number;

  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: '가이드 실천 조언 표시 순서',
  })
  order!: number;

  @ApiProperty({
    type: String,
    example: '물을 충분히 마시고 규칙적으로 움직여보세요.',
    description: '가이드 실천 조언 내용',
  })
  content!: string;
}

export class RecommendedGuideDto {
  @ApiProperty({
    type: Number,
    example: 2,
    minimum: 1,
    description: '추천 장 건강 가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    type: String,
    example: '브리스톨 변 형태 척도란?',
    description: '추천 장 건강 가이드 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '변 형태를 1~7형으로 구분해요.',
    description: '추천 장 건강 가이드 요약',
  })
  summary!: string;
}

export class GuidePatternEvidenceMetricDto {
  @ApiProperty({
    type: String,
    example: 'hardStoolDays',
    description: '패턴 판정 근거 식별 key',
  })
  key!: string;

  @ApiProperty({
    type: String,
    example: '딱딱한 변 기록일',
    description: '패턴 판정 근거 표시 이름',
  })
  label!: string;

  @ApiProperty({
    type: Number,
    example: 3,
    description: '사용자 기록에서 계산한 실제 값',
  })
  value!: number;

  @ApiProperty({
    type: Number,
    example: 2,
    description: '패턴을 감지하는 기준값',
  })
  threshold!: number;

  @ApiProperty({
    enum: ['DAY', 'COUNT', 'PERCENT', 'MINUTE'],
    example: 'DAY',
    description: 'value와 threshold의 단위',
  })
  unit!: 'DAY' | 'COUNT' | 'PERCENT' | 'MINUTE';

  @ApiPropertyOptional({
    enum: ['GTE', 'LTE'],
    example: 'GTE',
    description: '기준값 비교 방법. GTE 이상, LTE 이하',
  })
  comparison?: 'GTE' | 'LTE';
}

export class PatternReasonItemDto {
  @ApiProperty({
    enum: WEEKLY_RULE_CODES,
    example: WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY,
    description: '감지된 주간 패턴 rule code',
  })
  ruleCode!: WeeklyRuleCode;

  @ApiProperty({
    enum: ['OK', 'WARN', 'DANGER'],
    example: 'WARN',
    description: '패턴 단계',
  })
  level!: 'OK' | 'WARN' | 'DANGER';

  @ApiProperty({
    type: String,
    example: '딱딱한 변 경향',
    description: '감지 패턴 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '딱딱한 변이 자주 나타났어요.',
    description: '감지 패턴 설명. 설명이 정의되지 않았으면 null',
  })
  description!: string | null;

  @ApiProperty({
    type: [GuidePatternEvidenceMetricDto],
    description: '패턴 감지 근거 값',
  })
  evidence!: GuidePatternEvidenceMetricDto[];
}

export class PatternRecordStatusDto {
  @ApiProperty({
    enum: ['ENOUGH', 'INSUFFICIENT'],
    example: 'ENOUGH',
    description: '주간 패턴 분석 최소 기록일 충족 여부',
  })
  dataStatus!: 'ENOUGH' | 'INSUFFICIENT';

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
    description: '주간 패턴 분석에 필요한 최소 통합 기록일 수',
  })
  requiredDays!: number;

  @ApiProperty({
    type: Number,
    example: 71.4,
    minimum: 0,
    maximum: 100,
    description: '해당 주의 기록 완성도 점수',
  })
  completionScore!: number;
}

export class PatternGuideReasonDto {
  @ApiProperty({
    type: GuidePeriodDto,
    description: '패턴 감지 기준 주간 기간',
  })
  period!: GuidePeriodDto;

  @ApiProperty({
    type: PatternRecordStatusDto,
    description: '패턴 감지에 사용한 주간 기록 상태',
  })
  recordStatus!: PatternRecordStatusDto;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: '현재 조회 주에 이 가이드와 연결된 패턴이 감지됐는지 여부',
  })
  matched!: boolean;

  @ApiProperty({
    enum: WEEKLY_RULE_CODES,
    isArray: true,
    example: [WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY],
    description: '현재 조회 주에 감지된 가이드 연결 rule code',
  })
  matchedRuleCodes!: WeeklyRuleCode[];

  @ApiProperty({
    type: [PatternReasonItemDto],
    description: '현재 조회 주에 감지된 가이드 연결 패턴과 근거',
  })
  matchedPatterns!: PatternReasonItemDto[];
}

export class GuideDetailCommonDto {
  @ApiProperty({
    type: Number,
    example: 3,
    minimum: 1,
    description: '가이드 ID',
  })
  guideId!: number;

  @ApiProperty({
    type: String,
    example: '수면과 장 컨디션',
    description: '가이드 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '수면이 부족했던 날의 배변 변화를 확인해보세요.',
    description: '가이드 요약',
  })
  summary!: string;

  @ApiProperty({
    type: [GuideContentItemDto],
    description: 'ID 오름차순으로 정렬된 가이드 상세 본문',
  })
  contents!: GuideContentItemDto[];

  @ApiProperty({
    type: [GuideAdviceItemDto],
    description:
      'ID 오름차순으로 정렬된 실천 조언. 조언이 없거나 주의 신호 가이드이면 빈 배열 가능',
  })
  advices!: GuideAdviceItemDto[];

  @ApiProperty({
    type: [RecommendedGuideDto],
    description:
      '장 건강 가이드에서 현재 가이드를 제외한 다른 활성 장 건강 가이드. P/W 가이드는 빈 배열',
  })
  recommendedGuides!: RecommendedGuideDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'NIDDK · 질병관리청 국가건강정보포털',
    description: '가이드 내용의 출처. 등록된 출처가 없으면 null',
  })
  source!: string | null;
}

export class HealthGuideDetailResponseDto extends GuideDetailCommonDto {
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
    type: Object,
    nullable: true,
    example: null,
    description: '장 건강 가이드에서는 항상 null',
  })
  patternReason!: null;
}

export class PatternGuideDetailResponseDto extends GuideDetailCommonDto {
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
    type: PatternGuideReasonDto,
    description: '현재 조회 주의 패턴 감지 상태와 근거',
  })
  patternReason!: PatternGuideReasonDto;

  @ApiProperty({
    enum: ['G', 'A', 'N'],
    nullable: true,
    example: 'G',
    description:
      '현재 주에 사용자가 남긴 피드백. 피드백을 남기지 않았으면 null',
  })
  feedbackStatus!: GuideFeedbackStatus | null;
}

export class WarningGuideDetailResponseDto extends GuideDetailCommonDto {
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
    type: Object,
    nullable: true,
    example: null,
    description: '주의 신호 가이드에서는 항상 null',
  })
  patternReason!: null;
}

export type GuideDetailResponseDto =
  | HealthGuideDetailResponseDto
  | PatternGuideDetailResponseDto
  | WarningGuideDetailResponseDto;
