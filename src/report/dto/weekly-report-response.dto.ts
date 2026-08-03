import {
  WEEKLY_RULE_CODE,
  type WeeklyRuleCode,
} from '../pattern/weekly-pattern.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type WeeklyReportDataStatus = 'ENOUGH' | 'INSUFFICIENT';
export type ReportPeriodType = 'WEEKLY';
export type CompareType = 'PREVIOUS_WEEK';
export type ChangeTrend = 'INCREASE' | 'DECREASE' | 'SAME';

const WEEKLY_RULE_CODES = Object.values(WEEKLY_RULE_CODE);

export class ReportPeriodDto {
  @ApiProperty({
    enum: ['WEEKLY'],
    example: 'WEEKLY',
    description: '리포트 기간 단위',
  })
  type!: ReportPeriodType;

  @ApiProperty({
    example: '2026-07-20',
    format: 'date',
  })
  startDate!: string;

  @ApiProperty({
    example: '2026-07-26',
    format: 'date',
  })
  endDate!: string;
}

export class WeeklySummaryDto {
  @ApiProperty({ example: 6, description: '해당 주 총 배변 횟수' })
  bowelCount!: number;

  @ApiProperty({
    example: 1.2,
    minimum: 0,
    description: '7일을 총 배변 횟수로 나눈 평균 배변 간격(일)',
  })
  intervalAvg!: number;

  @ApiProperty({
    example: 85,
    minimum: 0,
    maximum: 100,
    description: '기록 완성도 점수',
  })
  completionScore!: number;
}

export class WeeklyRecordStatsDto {
  @ApiProperty({ example: 7 })
  totalDays!: number;

  @ApiProperty({
    example: 6,
    description: '배변 또는 생활 기록이 있는 날짜 수',
  })
  recordedDays!: number;

  @ApiProperty({ example: 5, description: '배변 기록이 있는 날짜 수' })
  boogleRecordDays!: number;

  @ApiProperty({ example: 6, description: '생활 기록이 있는 날짜 수' })
  lifeRecordDays!: number;

  @ApiProperty({ example: 3, description: '주간 분석에 필요한 최소 기록일' })
  requiredDays!: number;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100 })
  completionScore!: number;
}

export class PreviousWeeklySummaryDto extends WeeklySummaryDto {
  @ApiProperty({ type: ReportPeriodDto })
  period!: ReportPeriodDto;
}

export class ChangeSummaryDto {
  @ApiProperty({ enum: ['PREVIOUS_WEEK'] })
  compareType!: CompareType;

  @ApiProperty({ example: 1 })
  bowelCountDiff!: number;

  @ApiProperty({ nullable: true, example: 20 })
  bowelCountChangeRate!: number | null;

  @ApiProperty({
    example: -0.3,
    description: '현재 주 평균 배변 간격 - 이전 주 평균 배변 간격(일)',
  })
  intervalAvgDiff!: number;

  @ApiProperty({ example: 10, description: '단위 점' })
  completionScoreDiff!: number;

  @ApiProperty({
    enum: ['INCREASE', 'DECREASE', 'SAME'],
    example: 'INCREASE',
    description: '이전 주 대비 배변 횟수 변화 방향',
  })
  trend!: ChangeTrend;

  @ApiProperty({ description: '사용자 노출 비교 설명' })
  description!: string;
}

export class StoolDistributionDto {
  @ApiProperty({ enum: ['H', 'M', 'T'] })
  stoolSimple!: 'H' | 'M' | 'T';

  @ApiProperty({ example: '보통' })
  label!: string;

  @ApiProperty({ example: 4 })
  count!: number;

  @ApiProperty({ example: 66.7, description: '0~100' })
  ratio!: number;
}

export class BowelRhythmByDayDto {
  @ApiProperty({ enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] })
  dayOfWeek!: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

  @ApiProperty({ example: '월' })
  label!: string;

  @ApiProperty({ example: 1 })
  bowelCount!: number;
}

export class FrequentTimeSlotDto {
  @ApiProperty({ enum: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] })
  timeSlot!: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

  @ApiProperty({ example: '아침' })
  label!: string;

  @ApiProperty({ example: 3 })
  count!: number;
}

export class LifeFactorStatDto {
  @ApiProperty({ example: 'sleepTime' })
  sourceField!: string;

  @ApiProperty({ example: 'sleepTime = 1' })
  condition!: string;

  @ApiProperty({ example: '수면 부족' })
  label!: string;

  @ApiProperty({ example: 2 })
  count!: number;
}

export class LifeFactorStatsDto {
  @ApiProperty({ type: LifeFactorStatDto })
  lowSleep!: LifeFactorStatDto;

  @ApiProperty({ type: LifeFactorStatDto })
  highCaffeine!: LifeFactorStatDto;

  @ApiProperty({ type: LifeFactorStatDto })
  noExercise!: LifeFactorStatDto;

  @ApiProperty({ type: LifeFactorStatDto })
  highStress!: LifeFactorStatDto;

  @ApiProperty({ type: LifeFactorStatDto })
  lowWater!: LifeFactorStatDto;
}

export class PatternEvidenceMetricDto {
  @ApiProperty({ example: 'hardStoolDays' })
  key!: string;

  @ApiProperty({ example: '딱딱한 변 기록일' })
  label!: string;

  @ApiProperty({ example: 3 })
  value!: number;

  @ApiProperty({ example: 2 })
  threshold!: number;

  @ApiProperty({ enum: ['DAY', 'COUNT', 'PERCENT', 'MINUTE'] })
  unit!: 'DAY' | 'COUNT' | 'PERCENT' | 'MINUTE';

  @ApiPropertyOptional({
    enum: ['GTE', 'LTE'],
    example: 'GTE',
    description: '기준값 비교 방법. GTE 이상, LTE 이하',
  })
  comparison?: 'GTE' | 'LTE';
}

export class PatternCardDto {
  @ApiProperty({ enum: ['OK', 'WARN', 'DANGER'], example: 'WARN' })
  level!: 'OK' | 'WARN' | 'DANGER';

  @ApiProperty({
    enum: WEEKLY_RULE_CODES,
    example: WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY,
  })
  ruleCode!: WeeklyRuleCode;

  @ApiProperty({ example: '딱딱한 변 경향' })
  title!: string;

  @ApiProperty({ nullable: true, example: '딱딱한 변이 자주 나타났어요.' })
  description!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 101,
    description: '연결된 패턴 가이드 ID. 연결 가이드가 없으면 null',
  })
  guideId!: number | null;

  @ApiPropertyOptional({ type: [PatternEvidenceMetricDto] })
  evidence?: PatternEvidenceMetricDto[];
}

export class WeeklyGuideDto {
  @ApiProperty({ example: 101 })
  guideId!: number;

  @ApiProperty({ enum: ['P'] })
  category!: 'P';

  @ApiProperty({ example: '주간 가이드 제목' })
  title!: string;

  @ApiProperty({ example: '주간 가이드 요약' })
  summary!: string;

  @ApiProperty({ isArray: true, enum: WEEKLY_RULE_CODES })
  matchedRuleCodes!: WeeklyRuleCode[];
}

export class InsufficientNoticeDto {
  @ApiProperty({ enum: ['WEEKLY_RECORD_NOT_ENOUGH'] })
  code!: 'WEEKLY_RECORD_NOT_ENOUGH';

  @ApiProperty({
    example:
      '아직 분석할 기록이 부족해요. 3일 이상 기록하면 패턴을 확인할 수 있어요!',
  })
  message!: string;
}

export class WeeklyReportResponseDto {
  @ApiProperty({ type: ReportPeriodDto })
  period!: ReportPeriodDto;

  @ApiProperty({
    enum: ['ENOUGH', 'INSUFFICIENT'],
    example: 'ENOUGH',
    description: '최소 기록일 충족 여부',
  })
  dataStatus!: WeeklyReportDataStatus;

  @ApiProperty({
    type: WeeklySummaryDto,
    nullable: true,
    description: '기록 부족이면 null',
  })
  summary!: WeeklySummaryDto | null;

  @ApiProperty({ type: WeeklyRecordStatsDto })
  recordStats!: WeeklyRecordStatsDto;

  @ApiProperty({
    type: PreviousWeeklySummaryDto,
    nullable: true,
    description: '이전 주 비교 데이터가 없으면 null',
  })
  previousSummary!: PreviousWeeklySummaryDto | null;

  @ApiProperty({
    type: ChangeSummaryDto,
    nullable: true,
    description: '기록 부족 등으로 비교할 수 없으면 null',
  })
  changeSummary!: ChangeSummaryDto | null;

  @ApiProperty({ type: [StoolDistributionDto] })
  stoolDistribution!: StoolDistributionDto[];

  @ApiProperty({ type: [BowelRhythmByDayDto] })
  bowelRhythmByDay!: BowelRhythmByDayDto[];

  @ApiProperty({ type: [FrequentTimeSlotDto] })
  frequentTimeSlots!: FrequentTimeSlotDto[];

  @ApiProperty({
    type: LifeFactorStatsDto,
    nullable: true,
    description: '기록 부족이면 null',
  })
  lifeFactorStats!: LifeFactorStatsDto | null;

  @ApiProperty({
    type: [PatternCardDto],
    description: '감지된 주간 패턴. 기록 부족이면 빈 배열',
  })
  patternCards!: PatternCardDto[];

  @ApiProperty({
    type: [WeeklyGuideDto],
    description:
      '감지 패턴에 매칭된 가이드. includeGuide=false 또는 기록 부족이면 빈 배열',
  })
  guides!: WeeklyGuideDto[];

  @ApiProperty({
    type: InsufficientNoticeDto,
    nullable: true,
    description: '최소 기록일을 충족하면 null',
  })
  insufficientNotice!: InsufficientNoticeDto | null;
}
