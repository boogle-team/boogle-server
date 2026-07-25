export const WEEKLY_RULE_CODE = {
  LOW_BOWEL_FREQUENCY: 'LOW_BOWEL_FREQUENCY',
  HIGH_BOWEL_FREQUENCY: 'HIGH_BOWEL_FREQUENCY',
  LOW_BOWEL_FREQUENCY_30D: 'LOW_BOWEL_FREQUENCY_30D',
  LONG_NO_BOWEL_INTERVAL: 'LONG_NO_BOWEL_INTERVAL',
  NO_BOWEL_WITH_PAIN: 'NO_BOWEL_WITH_PAIN',
  HARD_STOOL_TENDENCY: 'HARD_STOOL_TENDENCY',
  FREQUENT_LOOSE_STOOL: 'FREQUENT_LOOSE_STOOL',
  CONTINUOUS_LOOSE_STOOL: 'CONTINUOUS_LOOSE_STOOL',
  REPEATED_SEVERE_PAIN: 'REPEATED_SEVERE_PAIN',
  LONG_TERM_LOOSE_STOOL: 'LONG_TERM_LOOSE_STOOL',
  REPEATED_DISTENSION: 'REPEATED_DISTENSION',
  REPEATED_REMAINING_FEELING: 'REPEATED_REMAINING_FEELING',
  PROLONGED_BOWEL_TIME: 'PROLONGED_BOWEL_TIME',
  LOW_WATER_WITH_HARD_STOOL: 'LOW_WATER_WITH_HARD_STOOL',
  STRESS_WITH_PAIN: 'STRESS_WITH_PAIN',
  FOOD_WITH_LOOSE_STOOL: 'FOOD_WITH_LOOSE_STOOL',
  CONTINUOUS_LOW_SLEEP: 'CONTINUOUS_LOW_SLEEP',
  HORMONE_WITH_STOOL_CHANGE: 'HORMONE_WITH_STOOL_CHANGE',
  BOWEL_TIME_SLOT_PATTERN: 'BOWEL_TIME_SLOT_PATTERN',
  STABLE_BOWEL_RHYTHM: 'STABLE_BOWEL_RHYTHM',
  REPEATED_URGENCY: 'REPEATED_URGENCY',
  IRREGULAR_MEAL: 'IRREGULAR_MEAL',
  LOW_STOOL_AMOUNT: 'LOW_STOOL_AMOUNT',
  CAFFEINE_WITH_STOOL_CHANGE: 'CAFFEINE_WITH_STOOL_CHANGE',
  NO_EXERCISE_WITH_LONG_INTERVAL: 'NO_EXERCISE_WITH_LONG_INTERVAL',
} as const;

export type WeeklyRuleCode =
  (typeof WEEKLY_RULE_CODE)[keyof typeof WEEKLY_RULE_CODE];

export type PatternLevel = 'OK' | 'WARN' | 'DANGER';

export interface WeeklyRuleDefinition {
  order: number;
  ruleCode: WeeklyRuleCode;
  title: string;
  description: string | null;
  level: PatternLevel;
}

export const WEEKLY_RULE_DEFINITIONS: readonly WeeklyRuleDefinition[] = [
  {
    order: 1,
    ruleCode: WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY,
    title: '배변 횟수 감소',
    description: '이번 주는 배변 횟수가 적은 편이에요.',
    level: 'WARN',
  },
  {
    order: 2,
    ruleCode: WEEKLY_RULE_CODE.HIGH_BOWEL_FREQUENCY,
    title: '배변 횟수 증가',
    description: '평소보다 배변 횟수가 많은 편이에요.',
    level: 'WARN',
  },
  {
    order: 3,
    ruleCode: WEEKLY_RULE_CODE.LOW_BOWEL_FREQUENCY_30D,
    title: '최근 30일간 배변 횟수 감소',
    description: '최근 30일 배변 횟수가 평소보다 적었어요.',
    level: 'WARN',
  },
  {
    order: 4,
    ruleCode: WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL,
    title: '배변 간격 증가',
    description: null,
    level: 'WARN',
  },
  {
    order: 5,
    ruleCode: WEEKLY_RULE_CODE.NO_BOWEL_WITH_PAIN,
    title: '무배변·복통 주의',
    description: '무배변 기간이 길고 복통이 함께 있었어요. 진료를 권장해요.',
    level: 'DANGER',
  },
  {
    order: 6,
    ruleCode: WEEKLY_RULE_CODE.HARD_STOOL_TENDENCY,
    title: '딱딱한 변 경향',
    description: '딱딱한 변이 자주 나타났어요.',
    level: 'WARN',
  },
  {
    order: 7,
    ruleCode: WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL,
    title: '묽은 변 경향',
    description: '묽은 변이 자주 나타났어요.',
    level: 'WARN',
  },
  {
    order: 8,
    ruleCode: WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    title: '묽은 변 지속',
    description: '묽은 변이 며칠째 이어졌어요.',
    level: 'WARN',
  },
  {
    order: 9,
    ruleCode: WEEKLY_RULE_CODE.REPEATED_SEVERE_PAIN,
    title: '심한 복통 반복',
    description: '심한 복통이 반복됐어요. 진료를 권장해요.',
    level: 'DANGER',
  },
  {
    order: 10,
    ruleCode: WEEKLY_RULE_CODE.LONG_TERM_LOOSE_STOOL,
    title: '장기 묽은 변',
    description: '2주 이상 묽은 변이 지속되고 있어요. 진료를 권장해요.',
    level: 'DANGER',
  },
  {
    order: 11,
    ruleCode: WEEKLY_RULE_CODE.REPEATED_DISTENSION,
    title: '복부 팽만 반복',
    description: '복부 팽만이 반복됐어요.',
    level: 'WARN',
  },
  {
    order: 12,
    ruleCode: WEEKLY_RULE_CODE.REPEATED_REMAINING_FEELING,
    title: '잔변감 반복',
    description: '잔변감이 자주 느껴졌어요.',
    level: 'WARN',
  },
  {
    order: 13,
    ruleCode: WEEKLY_RULE_CODE.PROLONGED_BOWEL_TIME,
    title: '배변 시간 지연',
    description: '배변 시간이 길고 힘들 때가 있었어요.',
    level: 'WARN',
  },
  {
    order: 14,
    ruleCode: WEEKLY_RULE_CODE.LOW_WATER_WITH_HARD_STOOL,
    title: '수분 부족과 딱딱한 변',
    description: '수분이 부족했던 날 딱딱한 변이 함께 나타났어요.',
    level: 'WARN',
  },
  {
    order: 15,
    ruleCode: WEEKLY_RULE_CODE.STRESS_WITH_PAIN,
    title: '스트레스성 복통',
    description: '스트레스가 높았던 날 복통이 함께 있었어요.',
    level: 'WARN',
  },
  {
    order: 16,
    ruleCode: WEEKLY_RULE_CODE.FOOD_WITH_LOOSE_STOOL,
    title: '음주·야식과 묽은 변',
    description: '음주·야식과 묽은 변이 자주 함께 나타났어요',
    level: 'WARN',
  },
  {
    order: 17,
    ruleCode: WEEKLY_RULE_CODE.CONTINUOUS_LOW_SLEEP,
    title: '수면 부족 지속',
    description: '수면 부족이 며칠째 이어졌어요.',
    level: 'WARN',
  },
  {
    order: 18,
    ruleCode: WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE,
    title: '호르몬 변화와 장 상태',
    description: '호르몬 변화 시기와 변 상태 변화가 함께 나타났어요.',
    level: 'WARN',
  },
  {
    order: 19,
    ruleCode: WEEKLY_RULE_CODE.BOWEL_TIME_SLOT_PATTERN,
    title: '배변 리듬 시간대',
    description: '특정 시간대에 배변이 집중되는 패턴이 있어요.',
    level: 'OK',
  },
  {
    order: 20,
    ruleCode: WEEKLY_RULE_CODE.STABLE_BOWEL_RHYTHM,
    title: '배변 리듬 안정',
    description: '평소 리듬을 안정적으로 유지하고 있어요.',
    level: 'OK',
  },
  {
    order: 21,
    ruleCode: WEEKLY_RULE_CODE.REPEATED_URGENCY,
    title: '급박감 반복',
    description: '급박감을 자주 느꼈어요.',
    level: 'WARN',
  },
  {
    order: 22,
    ruleCode: WEEKLY_RULE_CODE.IRREGULAR_MEAL,
    title: '식사 시간 불규칙',
    description: '식사 시간이 불규칙했던 날이 많았어요.',
    level: 'WARN',
  },
  {
    order: 23,
    ruleCode: WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT,
    title: '배변량 감소',
    description: '배변량이 적었던 날이 많았어요.',
    level: 'WARN',
  },
  {
    order: 24,
    ruleCode: WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE,
    title: '카페인과 변 상태',
    description: '카페인 섭취가 많았던 날 변 상태가 함께 달라졌어요.',
    level: 'WARN',
  },
  {
    order: 25,
    ruleCode: WEEKLY_RULE_CODE.NO_EXERCISE_WITH_LONG_INTERVAL,
    title: '운동 부족과 배변 간격',
    description: '움직임이 적었던 주에 배변이 뜸해졌어요.',
    level: 'WARN',
  },
] as const;

export interface PatternGuideBinding {
  guideTitle: string;
  ruleCodes: readonly WeeklyRuleCode[];
}

export const PATTERN_GUIDE_BINDINGS: readonly PatternGuideBinding[] = [
  {
    guideTitle: '수분과 딱딱한 변의 관계',
    ruleCodes: [WEEKLY_RULE_CODE.LOW_WATER_WITH_HARD_STOOL],
  },
  {
    guideTitle: '수면과 장 컨디션',
    ruleCodes: [WEEKLY_RULE_CODE.CONTINUOUS_LOW_SLEEP],
  },
  {
    guideTitle: '복부 팽만이 반복된다면?',
    ruleCodes: [WEEKLY_RULE_CODE.REPEATED_DISTENSION],
  },
  {
    guideTitle: '잔변감이 자주 느껴진다면',
    ruleCodes: [WEEKLY_RULE_CODE.REPEATED_REMAINING_FEELING],
  },
  {
    guideTitle: '급박감이 있다면?',
    ruleCodes: [WEEKLY_RULE_CODE.REPEATED_URGENCY],
  },
  {
    guideTitle: '배변 시간이 길어진다면',
    ruleCodes: [WEEKLY_RULE_CODE.PROLONGED_BOWEL_TIME],
  },
  {
    guideTitle: '배변 양이란?',
    ruleCodes: [WEEKLY_RULE_CODE.LOW_STOOL_AMOUNT],
  },
  {
    guideTitle: '배변이 며칠간 없다면?',
    ruleCodes: [WEEKLY_RULE_CODE.LONG_NO_BOWEL_INTERVAL],
  },
  {
    guideTitle: '묽은 변이 잦다면?',
    ruleCodes: [
      WEEKLY_RULE_CODE.FREQUENT_LOOSE_STOOL,
      WEEKLY_RULE_CODE.CONTINUOUS_LOOSE_STOOL,
    ],
  },
  {
    guideTitle: '음식과 장 건강의 관계',
    ruleCodes: [WEEKLY_RULE_CODE.FOOD_WITH_LOOSE_STOOL],
  },
  {
    guideTitle: '호르몬과 장 건강의 관계',
    ruleCodes: [WEEKLY_RULE_CODE.HORMONE_WITH_STOOL_CHANGE],
  },
  {
    guideTitle: '식사가 불규칙하다면?',
    ruleCodes: [WEEKLY_RULE_CODE.IRREGULAR_MEAL],
  },
  {
    guideTitle: '카페인과 장의 관계',
    ruleCodes: [WEEKLY_RULE_CODE.CAFFEINE_WITH_STOOL_CHANGE],
  },
  {
    guideTitle: '운동 부족과 장의 관계',
    ruleCodes: [WEEKLY_RULE_CODE.NO_EXERCISE_WITH_LONG_INTERVAL],
  },
] as const;

const RULE_DEFINITION_MAP = new Map(
  WEEKLY_RULE_DEFINITIONS.map((definition) => [
    definition.ruleCode,
    definition,
  ]),
);

export function getWeeklyRuleDefinition(
  ruleCode: WeeklyRuleCode,
): WeeklyRuleDefinition {
  const definition = RULE_DEFINITION_MAP.get(ruleCode);

  if (definition === undefined) {
    throw new Error(`Unknown weekly rule code: ${ruleCode}`);
  }

  return definition;
}
