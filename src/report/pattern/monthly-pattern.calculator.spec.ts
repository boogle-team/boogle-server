import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import {
  buildMonthlyImprovements,
  buildMonthlyPatternCards,
  calculateMonthlyPatternMetrics,
  MONTHLY_PATTERN_CODE,
  type MonthlyPatternMetrics,
} from './monthly-pattern.calculator';

type BoogleOverrides = Partial<Omit<BoogleRecordForReport, 'id' | 'regDate'>>;
type LifeOverrides = Partial<Omit<LifeRecordForReport, 'id' | 'regDate'>>;

let nextBoogleId = 1n;
let nextLifeId = 1n;

function createBoogleRecord(
  dateTime: string,
  overrides: BoogleOverrides = {},
): BoogleRecordForReport {
  const id = nextBoogleId;
  nextBoogleId += 1n;

  return {
    id,
    regDate: new Date(dateTime),
    hasBowel: true,
    stoolBristol: 4,
    stoolSimple: 'M',
    bowelFeeling: null,
    stomach: null,
    distension: null,
    remainingFeeling: null,
    urgency: null,
    takenTime: null,
    amount: null,
    ...overrides,
  };
}

function createLifeRecord(
  dateTime: string,
  overrides: LifeOverrides = {},
): LifeRecordForReport {
  const id = nextLifeId;
  nextLifeId += 1n;

  return {
    id,
    regDate: new Date(dateTime),
    sleep: null,
    sleepTime: null,
    caffeine: null,
    exercise: null,
    stress: null,
    water: null,
    waterIntake: null,
    mealRegular: null,
    hormone: null,
    foodTags: [],
    ...overrides,
  };
}

describe('monthly-pattern.calculator', () => {
  beforeEach(() => {
    nextBoogleId = 1n;
    nextLifeId = 1n;
  });

  describe('calculateMonthlyPatternMetrics', () => {
    it('관련 관측값이 없으면 모든 metric을 null로 반환한다', () => {
      const metrics = calculateMonthlyPatternMetrics([], []);

      expect(metrics).toEqual({
        lowWaterWithHardStoolDays: null,
        stressWithPainCount: null,
        lowSleepDays: null,
        hardStoolRatio: null,
      });
    });

    it('KST 같은 날짜의 Boogle/Life 기록으로 metric을 계산한다', () => {
      const boogleRecords = [
        createBoogleRecord('2026-07-02T00:30:00+09:00', {
          stoolBristol: 2,
          stoolSimple: 'H',
          stomach: 'M',
        }),
        createBoogleRecord('2026-07-02T09:00:00+09:00', {
          stoolBristol: 4,
          stoolSimple: 'M',
        }),
        createBoogleRecord('2026-07-03T00:30:00+09:00', {
          stoolBristol: 6,
          stoolSimple: 'T',
          stomach: 'L',
        }),
      ];
      const lifeRecords = [
        createLifeRecord('2026-07-02T01:00:00+09:00', {
          waterIntake: 2,
          stress: 'H',
          sleep: 'B',
        }),
        createLifeRecord('2026-07-03T01:00:00+09:00', {
          waterIntake: 5,
          stress: 'H',
          sleep: 'G',
        }),
      ];

      const metrics = calculateMonthlyPatternMetrics(
        boogleRecords,
        lifeRecords,
      );

      expect(metrics).toEqual({
        lowWaterWithHardStoolDays: 1,
        stressWithPainCount: 2,
        lowSleepDays: 1,
        hardStoolRatio: 33.3,
      });
    });

    it('관측값은 있지만 조건이 없으면 null이 아니라 0을 반환한다', () => {
      const boogleRecords = [
        createBoogleRecord('2026-07-02T08:00:00+09:00', {
          stoolBristol: 4,
          stoolSimple: 'M',
          stomach: 'N',
        }),
      ];
      const lifeRecords = [
        createLifeRecord('2026-07-02T09:00:00+09:00', {
          waterIntake: 5,
          stress: 'L',
          sleep: 'G',
        }),
      ];

      const metrics = calculateMonthlyPatternMetrics(
        boogleRecords,
        lifeRecords,
      );

      expect(metrics).toEqual({
        lowWaterWithHardStoolDays: 0,
        stressWithPainCount: 0,
        lowSleepDays: 0,
        hardStoolRatio: 0,
      });
    });
  });

  describe('buildMonthlyPatternCards', () => {
    it('각 threshold 경계값에서 네 종류의 카드를 생성한다', () => {
      const metrics: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 12,
        stressWithPainCount: 8,
        lowSleepDays: 10,
        hardStoolRatio: 50,
      };

      const cards = buildMonthlyPatternCards(metrics);

      expect(cards.map((card) => card.ruleCode)).toEqual([
        MONTHLY_PATTERN_CODE.LOW_WATER_WITH_HARD_STOOL,
        MONTHLY_PATTERN_CODE.STRESS_WITH_PAIN,
        MONTHLY_PATTERN_CODE.LOW_SLEEP,
        MONTHLY_PATTERN_CODE.HARD_STOOL_RATIO,
      ]);
      expect(cards.map((card) => card.value)).toEqual([12, 8, 10, 50]);
      expect(cards.map((card) => card.threshold)).toEqual([12, 8, 10, 50]);
    });

    it('null 또는 threshold 미만 metric은 카드로 만들지 않는다', () => {
      const metrics: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: null,
        stressWithPainCount: 7,
        lowSleepDays: 9,
        hardStoolRatio: 49.9,
      };

      expect(buildMonthlyPatternCards(metrics)).toEqual([]);
    });
  });

  describe('buildMonthlyImprovements', () => {
    it('이전 metric 또는 이전 점수가 없으면 개선점을 만들지 않는다', () => {
      const current: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 1,
        stressWithPainCount: 1,
        lowSleepDays: 1,
        hardStoolRatio: 20,
      };
      const previous: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 2,
        stressWithPainCount: 2,
        lowSleepDays: 2,
        hardStoolRatio: 40,
      };

      expect(buildMonthlyImprovements(current, null, 70, 60)).toEqual([]);
      expect(buildMonthlyImprovements(current, previous, 70, null)).toEqual([]);
    });

    it('점수 상승과 네 종류의 metric 감소를 개선점으로 만든다', () => {
      const current: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 1,
        stressWithPainCount: 1,
        lowSleepDays: 1,
        hardStoolRatio: 25,
      };
      const previous: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 3,
        stressWithPainCount: 2,
        lowSleepDays: 4,
        hardStoolRatio: 50,
      };

      const improvements = buildMonthlyImprovements(current, previous, 70, 60);

      expect(improvements.map((item) => item.code)).toEqual([
        'CONDITION_SCORE_UP',
        'HARD_STOOL_RATIO_DOWN',
        'LOW_WATER_HARD_STOOL_DOWN',
        'STRESS_WITH_PAIN_DOWN',
        'LOW_SLEEP_DOWN',
      ]);
      expect(
        improvements.map((item) => [item.previousValue, item.currentValue]),
      ).toEqual([
        [60, 70],
        [50, 25],
        [3, 1],
        [2, 1],
        [4, 1],
      ]);
    });

    it('현재 또는 이전 metric이 null이면 해당 개선점만 제외한다', () => {
      const current: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: null,
        stressWithPainCount: 1,
        lowSleepDays: null,
        hardStoolRatio: null,
      };
      const previous: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 3,
        stressWithPainCount: 2,
        lowSleepDays: 4,
        hardStoolRatio: 50,
      };

      const improvements = buildMonthlyImprovements(current, previous, 60, 60);

      expect(improvements.map((item) => item.code)).toEqual([
        'STRESS_WITH_PAIN_DOWN',
      ]);
    });

    it('현재 값이 같거나 악화되면 개선점을 만들지 않는다', () => {
      const current: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 3,
        stressWithPainCount: 3,
        lowSleepDays: 4,
        hardStoolRatio: 50,
      };
      const previous: MonthlyPatternMetrics = {
        lowWaterWithHardStoolDays: 3,
        stressWithPainCount: 2,
        lowSleepDays: 4,
        hardStoolRatio: 40,
      };

      expect(buildMonthlyImprovements(current, previous, 55, 60)).toEqual([]);
    });
  });
});
