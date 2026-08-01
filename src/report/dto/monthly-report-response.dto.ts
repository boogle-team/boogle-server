import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MonthlyReportDataStatus = 'ENOUGH' | 'INSUFFICIENT';
export type MonthlyReportPeriodType = 'MONTHLY';
export type MonthlyCompareType = 'PREVIOUS_MONTH';

export type MonthlyChangeTrend =
  | 'INCREASE'
  | 'DECREASE'
  | 'SAME'
  | 'IMPROVED'
  | 'WORSENED'
  | 'NO_PREVIOUS_DATA';

export type MonthlyChangeReasonCode = 'PREVIOUS_MONTH_NOT_FOUND';

export class MonthlyReportPeriodDto {
  @ApiProperty({
    enum: ['MONTHLY'],
    example: 'MONTHLY',
    description: '리포트 기간 단위',
  })
  type!: MonthlyReportPeriodType;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-01',
    description: '월간 리포트 조회 시작일',
  })
  startDate!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-27',
    description:
      '월간 리포트 조회 종료일. 현재 월이면 KST 기준 오늘, 그 외 월이면 월 말일',
  })
  endDate!: string;
}

export class MonthlySummaryDto {
  @ApiProperty({
    type: Number,
    example: 18,
    minimum: 0,
    description: '조회 기간의 총 배변 횟수',
  })
  bowelCount!: number;

  @ApiProperty({
    type: Number,
    example: 15,
    minimum: 0,
    description: '조회 기간 중 배변 기록이 있는 날짜 수',
  })
  bowelDays!: number;

  @ApiProperty({
    type: Number,
    example: 2,
    minimum: 0,
    description: '30일을 배변 기록일 수로 나눈 평균 배변 간격(일)',
  })
  intervalAvg!: number;

  @ApiProperty({
    type: Number,
    example: 76.7,
    minimum: 0,
    maximum: 100,
    description: '30일 기준 통합 기록일의 기록 완성도 점수',
  })
  completionScore!: number;

  @ApiProperty({
    type: Number,
    example: 72.2,
    minimum: 0,
    maximum: 100,
    description: '비슷한 시간대에 배변한 정도를 나타내는 리듬 안정도 점수',
  })
  rhythmScore!: number;

  @ApiProperty({
    type: Number,
    example: 66.7,
    minimum: 0,
    maximum: 100,
    description: '정상 범위 변 상태의 비율을 나타내는 상태 안정도 점수',
  })
  stateScore!: number;

  @ApiProperty({
    type: Number,
    example: 72,
    minimum: 0,
    maximum: 100,
    description:
      '기록 완성도 40%, 리듬 안정도 30%, 상태 안정도 30%를 반영한 장 컨디션 점수',
  })
  conditionScore!: number;

  @ApiProperty({
    enum: [1, 2, 3],
    example: 2,
    description: '장 컨디션 상태 단계. 1 좋음, 2 보통, 3 주의 필요',
  })
  state!: number;

  @ApiProperty({
    enum: ['좋음', '보통', '주의 필요'],
    example: '보통',
    description: '장 컨디션 상태 표시 문구',
  })
  stateLabel!: string;
}

export class MonthlyRecordStatsDto {
  @ApiProperty({
    enum: [30],
    example: 30,
    description: '기록 완성도와 월간 점수 계산에 사용하는 고정 분석 일수',
  })
  totalDays!: 30;

  @ApiProperty({
    type: Number,
    example: 31,
    minimum: 28,
    maximum: 31,
    description: '조회 대상 달의 실제 달력 일수',
  })
  calendarDays!: number;

  @ApiProperty({
    type: Number,
    example: 23,
    minimum: 0,
    description: '배변 또는 생활 기록 중 하나 이상 존재하는 통합 기록일 수',
  })
  recordedDays!: number;

  @ApiProperty({
    type: Number,
    example: 18,
    minimum: 0,
    description: '배변 기록이 하나 이상 존재하는 날짜 수',
  })
  boogleRecordDays!: number;

  @ApiProperty({
    type: Number,
    example: 21,
    minimum: 0,
    description: '생활 기록이 하나 이상 존재하는 날짜 수',
  })
  lifeRecordDays!: number;

  @ApiProperty({
    enum: [7],
    example: 7,
    description: '월간 리포트 분석에 필요한 최소 통합 기록일 수',
  })
  requiredDays!: 7;

  @ApiProperty({
    type: Number,
    example: 76.7,
    minimum: 0,
    maximum: 100,
    description: 'min(통합 기록일 / 30 * 100, 100)으로 계산한 기록 완성도',
  })
  completionScore!: number;
}

export class PreviousMonthlySummaryDto extends MonthlySummaryDto {
  @ApiProperty({
    type: MonthlyReportPeriodDto,
    description: '비교 대상인 이전 달의 기간',
  })
  period!: MonthlyReportPeriodDto;

  @ApiProperty({
    enum: ['R', 'C', 'L', 'I', 'U', 'N'],
    nullable: true,
    example: 'R',
    description:
      '이전 달 사용자 유형 코드. R 규칙형, C 변비경향형, L 묽은변경향형, I 생활영향형, U 불규칙형, N 기록부족형',
  })
  userType!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '규칙형',
    description: '이전 달 사용자 유형 표시 이름',
  })
  userTypeLabel!: string | null;
}

export class MonthlyChangeSummaryDto {
  @ApiProperty({
    enum: ['PREVIOUS_MONTH'],
    example: 'PREVIOUS_MONTH',
    description: '현재 월과 비교하는 대상',
  })
  compareType!: MonthlyCompareType;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: '이전 달과 비교 가능한지 여부',
  })
  compareAvailable!: boolean;

  @ApiPropertyOptional({
    enum: ['PREVIOUS_MONTH_NOT_FOUND'],
    example: 'PREVIOUS_MONTH_NOT_FOUND',
    description:
      '이전 달 기록이 7일 미만이라 비교할 수 없을 때 반환되는 사유 코드',
  })
  reasonCode?: MonthlyChangeReasonCode;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 3,
    description: '현재 월 총 배변 횟수 - 이전 달 총 배변 횟수',
  })
  bowelCountDiff!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 20,
    description:
      '이전 달 대비 배변 횟수 증감률(%). 이전 달 배변 횟수가 0이면 null',
  })
  bowelCountChangeRate!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: -0.3,
    description: '현재 월 평균 배변 간격 - 이전 달 평균 배변 간격(일)',
  })
  intervalAvgDiff!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 10,
    description: '현재 월 기록 완성도 - 이전 달 기록 완성도(점)',
  })
  completionScoreDiff!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 8,
    description: '현재 월 장 컨디션 점수 - 이전 달 장 컨디션 점수',
  })
  conditionScoreDiff!: number | null;

  @ApiProperty({
    enum: [
      'INCREASE',
      'DECREASE',
      'SAME',
      'IMPROVED',
      'WORSENED',
      'NO_PREVIOUS_DATA',
    ],
    example: 'IMPROVED',
    description: '이전 달 대비 변화 방향',
  })
  trend!: MonthlyChangeTrend;

  @ApiProperty({
    type: String,
    example:
      '지난달보다 배변 횟수는 3회 증가했고, 장 컨디션 점수는 8점 높아졌어요.',
    description: '사용자에게 보여줄 월간 변화 설명',
  })
  description!: string;
}

export class MonthlyStoolDistributionDto {
  @ApiProperty({
    enum: ['H', 'M', 'T'],
    example: 'M',
    description: '간단 변 상태. H 딱딱함, M 보통, T 묽음',
  })
  stoolSimple!: 'H' | 'M' | 'T';

  @ApiProperty({
    enum: ['딱딱함', '보통', '묽음'],
    example: '보통',
    description: '변 상태 사용자 표시 문구',
  })
  label!: string;

  @ApiProperty({
    type: Number,
    example: 12,
    minimum: 0,
    description: '해당 변 상태로 기록된 배변 횟수',
  })
  count!: number;

  @ApiProperty({
    type: Number,
    example: 66.7,
    minimum: 0,
    maximum: 100,
    description: '전체 유효 변 상태 기록 중 해당 상태의 비율(%)',
  })
  ratio!: number;
}

export class WeeklyTrendDto {
  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: '월 내 주차 순서',
  })
  weekIndex!: number;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-01',
    description: '해당 주차 구간 시작일',
  })
  weekStartDate!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-07',
    description: '해당 주차 구간 종료일',
  })
  weekEndDate!: string;

  @ApiProperty({
    type: Number,
    example: 4,
    minimum: 0,
    description: '해당 주차 구간의 배변 횟수',
  })
  bowelCount!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 75,
    minimum: 0,
    maximum: 100,
    description: '해당 주차 구간의 장 컨디션 점수',
  })
  conditionScore!: number | null;
}

export class MonthlyLifeFactorStatsDto {
  @ApiProperty({
    type: Number,
    example: 5,
    minimum: 0,
    description: '수면 시간이 부족한 생활 기록 수(sleepTime = 1)',
  })
  lowSleepCount!: number;

  @ApiProperty({
    type: Number,
    example: 4,
    minimum: 0,
    description: '카페인 섭취가 많은 생활 기록 수(caffeine = M)',
  })
  highCaffeineCount!: number;

  @ApiProperty({
    type: Number,
    example: 8,
    minimum: 0,
    description: '운동하지 않은 생활 기록 수(exercise = N)',
  })
  noExerciseCount!: number;

  @ApiProperty({
    type: Number,
    example: 6,
    minimum: 0,
    description: '스트레스가 높은 생활 기록 수(stress = H)',
  })
  highStressCount!: number;

  @ApiProperty({
    type: Number,
    example: 7,
    minimum: 0,
    description: '수분 섭취가 부족한 생활 기록 수(water = L)',
  })
  lowWaterCount!: number;

  @ApiProperty({
    type: Number,
    example: 3,
    minimum: 0,
    description: '식사가 불규칙한 생활 기록 수(mealRegular = I)',
  })
  irregularMealCount!: number;
}

export class MonthlyUserTypeDto {
  @ApiProperty({
    enum: ['R', 'C', 'L', 'I', 'U', 'N'],
    example: 'R',
    description:
      'R 규칙형, C 변비경향형, L 묽은변경향형, I 생활영향형, U 불규칙형, N 기록부족형',
  })
  code!: string;

  @ApiProperty({
    type: String,
    example: '규칙형',
    description: '월간 사용자 유형 이름',
  })
  name!: string;

  @ApiProperty({
    type: String,
    example: '최근 30일 동안 배변 리듬이 비교적 안정적으로 유지되고 있어요.',
    description: '월간 사용자 유형 설명',
  })
  description!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uri',
    example: null,
    description:
      '사용자 유형 캐릭터 이미지 URL. 데이터가 없으면 생략되거나 null',
  })
  characterImageUrl?: string | null;
}

export class MonthlyPatternCardDto {
  @ApiProperty({
    enum: ['WARN'],
    example: 'WARN',
    description: '월간 패턴 경고 단계',
  })
  level!: 'WARN';

  @ApiProperty({
    enum: [
      'MONTHLY_LOW_WATER_WITH_HARD_STOOL',
      'MONTHLY_STRESS_WITH_PAIN',
      'MONTHLY_LOW_SLEEP',
      'MONTHLY_HARD_STOOL_RATIO',
    ],
    example: 'MONTHLY_LOW_WATER_WITH_HARD_STOOL',
    description: '월간 패턴 감지 코드',
  })
  ruleCode!: string;

  @ApiProperty({
    type: String,
    example: '수분 부족과 딱딱한 변',
    description: '월간 패턴 카드 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '수분이 부족했던 날, 딱딱한 변이 함께 나타난 날이 많았어요.',
    description: '월간 패턴 카드 설명',
  })
  description!: string;

  @ApiProperty({
    type: Number,
    example: 14,
    minimum: 0,
    description: '감지된 실제 값',
  })
  value!: number;

  @ApiProperty({
    type: Number,
    example: 12,
    minimum: 0,
    description: '패턴 감지 기준값',
  })
  threshold!: number;

  @ApiProperty({
    enum: ['DAY', 'COUNT', 'PERCENT'],
    example: 'DAY',
    description: 'value와 threshold의 단위',
  })
  unit!: 'DAY' | 'COUNT' | 'PERCENT';
}

export class MonthlyImprovementDto {
  @ApiProperty({
    enum: [
      'CONDITION_SCORE_UP',
      'HARD_STOOL_RATIO_DOWN',
      'LOW_WATER_HARD_STOOL_DOWN',
      'STRESS_WITH_PAIN_DOWN',
      'LOW_SLEEP_DOWN',
    ],
    example: 'HARD_STOOL_RATIO_DOWN',
    description: '이전 달 대비 개선 항목 코드',
  })
  code!:
    | 'CONDITION_SCORE_UP'
    | 'HARD_STOOL_RATIO_DOWN'
    | 'LOW_WATER_HARD_STOOL_DOWN'
    | 'STRESS_WITH_PAIN_DOWN'
    | 'LOW_SLEEP_DOWN';

  @ApiProperty({
    type: String,
    example: '딱딱한 변 비율 감소',
    description: '개선 항목 제목',
  })
  title!: string;

  @ApiProperty({
    type: String,
    example: '같은 기간 기준 딱딱한 변 비율이 45%에서 25%로 줄었어요.',
    description: '현재 월과 이전 달을 비교한 개선 설명',
  })
  description!: string;

  @ApiProperty({
    type: Number,
    example: 45,
    description: '이전 달 비교 값',
  })
  previousValue!: number;

  @ApiProperty({
    type: Number,
    example: 25,
    description: '현재 달 비교 값',
  })
  currentValue!: number;

  @ApiProperty({
    enum: ['POINT', 'DAY', 'COUNT', 'PERCENT'],
    example: 'PERCENT',
    description: '이전 값과 현재 값의 단위',
  })
  unit!: 'POINT' | 'DAY' | 'COUNT' | 'PERCENT';
}

export class MonthlyPdfDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'PDF 리포트 다운로드 가능 여부',
  })
  downloadAvailable!: boolean;

  @ApiProperty({
    type: String,
    example: '/api/v1/reports/pdf',
    description: 'PDF 리포트 생성 API endpoint',
  })
  endpoint!: string;
}

export class MonthlyNoticeDto {
  @ApiProperty({
    enum: ['MONTHLY_RECORD_NOT_ENOUGH'],
    example: 'MONTHLY_RECORD_NOT_ENOUGH',
    description: '월간 리포트 기록 부족 알림 코드',
  })
  code!: 'MONTHLY_RECORD_NOT_ENOUGH';

  @ApiProperty({
    type: String,
    example:
      '현재 5일째 기록 중이에요. 7일 이상 기록하면 월간 리포트를 볼 수 있어요.',
    description: '사용자에게 보여줄 기록 부족 안내',
  })
  message!: string;
}

export class MonthlyReportResponseDto {
  @ApiProperty({
    type: MonthlyReportPeriodDto,
    description: '월간 리포트 조회 기간',
  })
  period!: MonthlyReportPeriodDto;

  @ApiProperty({
    enum: ['ENOUGH', 'INSUFFICIENT'],
    example: 'ENOUGH',
    description: '월간 분석 최소 기록일 충족 여부',
  })
  dataStatus!: MonthlyReportDataStatus;

  @ApiProperty({
    type: MonthlySummaryDto,
    nullable: true,
    description: '월간 요약 결과. 기록일이 7일 미만이면 null',
  })
  summary!: MonthlySummaryDto | null;

  @ApiProperty({
    type: MonthlyRecordStatsDto,
    description: '월간 기록 일수와 기록 완성도',
  })
  recordStats!: MonthlyRecordStatsDto;

  @ApiProperty({
    type: PreviousMonthlySummaryDto,
    nullable: true,
    description: '이전 달 기록이 7일 미만이면 null',
  })
  previousSummary!: PreviousMonthlySummaryDto | null;

  @ApiProperty({
    type: MonthlyChangeSummaryDto,
    nullable: true,
    description:
      '현재 월 기록이 7일 미만이면 null. 현재 월 기록은 충분하지만 이전 달 기록이 부족하면 compareAvailable=false',
  })
  changeSummary!: MonthlyChangeSummaryDto | null;

  @ApiProperty({
    type: [MonthlyStoolDistributionDto],
    description: '딱딱함/보통/묽음 변 상태 분포. 기록 부족이면 빈 배열',
  })
  stoolDistribution!: MonthlyStoolDistributionDto[];

  @ApiProperty({
    type: [WeeklyTrendDto],
    description:
      '월을 주차별로 나눈 배변 횟수와 컨디션 추이. 기록 부족이면 빈 배열',
  })
  weeklyTrend!: WeeklyTrendDto[];

  @ApiProperty({
    type: MonthlyLifeFactorStatsDto,
    nullable: true,
    description: '월간 생활 요인별 기록 횟수. 기록 부족이면 null',
  })
  lifeFactorStats!: MonthlyLifeFactorStatsDto | null;

  @ApiProperty({
    type: MonthlyUserTypeDto,
    nullable: true,
    description: '월간 사용자 유형. 월간 리포트 기록이 부족하면 null',
  })
  userType!: MonthlyUserTypeDto | null;

  @ApiProperty({
    type: [MonthlyPatternCardDto],
    description:
      '이번 달 감지 패턴. includePattern=false 또는 기록 부족이면 빈 배열',
  })
  patternCards!: MonthlyPatternCardDto[];

  @ApiProperty({
    type: [MonthlyImprovementDto],
    description:
      '이전 달과 현재 달의 비교 가능 기간에 각각 7일 이상 기록이 있을 때 계산한 개선점',
  })
  improvements!: MonthlyImprovementDto[];

  @ApiProperty({
    type: MonthlyPdfDto,
    description: 'PDF 리포트 생성 API 정보',
  })
  pdf!: MonthlyPdfDto;

  @ApiProperty({
    type: MonthlyNoticeDto,
    nullable: true,
    description: '최소 기록일을 충족하면 null',
  })
  notice!: MonthlyNoticeDto | null;
}
