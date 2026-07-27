import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import type { MonthlyPdfSourceData } from '../dto/pdf-report-data.dto';
import { buildMonthlyPdfData } from './monthly-pdf.mapper';

function kstDate(dateKey: string, time = '09:00'): Date {
  return new Date(`${dateKey}T${time}:00.000+09:00`);
}

function createBoogleRecord(
  overrides: Partial<BoogleRecordForReport> = {},
): BoogleRecordForReport {
  return {
    id: 1n,
    regDate: kstDate('2026-07-01'),
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
  overrides: Partial<LifeRecordForReport> = {},
): LifeRecordForReport {
  return {
    id: 1n,
    regDate: kstDate('2026-07-01'),
    sleep: 'N',
    sleepTime: null,
    caffeine: null,
    exercise: null,
    stress: 'N',
    water: 'N',
    waterIntake: null,
    mealRegular: 'N',
    hormone: null,
    foodTags: [],
    ...overrides,
  };
}

function createSourceFixture(
  overrides: Partial<MonthlyPdfSourceData> = {},
): MonthlyPdfSourceData {
  return {
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    generatedDate: '2026-07-15',
    bowelCount: 0,
    intervalAvg: 0,
    completionScore: 0,
    boogleRecords: [],
    lifeRecords: [],
    patternCards: [],
    ...overrides,
  };
}

describe('buildMonthlyPdfData', () => {
  it('조회 기간과 생성일을 dot 형식으로 만들고 모든 날짜를 생성한다', () => {
    const result = buildMonthlyPdfData(
      createSourceFixture({
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        generatedDate: '2026-06-15',
      }),
    );

    expect(result.period).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      generatedDate: '2026-06-15',
      displayRange: '2026.06.01 - 2026.06.15 (15일)',
      displayGeneratedDate: '2026.06.15',
      inclusiveDays: 15,
    });
    expect(result.dailyRows).toHaveLength(15);
    expect(result.dailyRows[0].date).toBe('6/1');
    expect(result.dailyRows[14].date).toBe('6/15');
  });

  it('배변한 유효 H/M/T 기록만 변 상태 분포에 포함한다', () => {
    const result = buildMonthlyPdfData(
      createSourceFixture({
        boogleRecords: [
          createBoogleRecord({ id: 1n, stoolSimple: 'M' }),
          createBoogleRecord({ id: 2n, stoolSimple: 'H' }),
          createBoogleRecord({ id: 3n, stoolSimple: 'H' }),
          createBoogleRecord({ id: 4n, stoolSimple: 'T' }),
          createBoogleRecord({
            id: 5n,
            hasBowel: false,
            stoolSimple: 'H',
          }),
          createBoogleRecord({ id: 6n, stoolSimple: 'X' }),
        ],
      }),
    );

    expect(result.stoolDistribution).toEqual([
      { code: 'M', label: '보통', count: 1, ratio: 25 },
      { code: 'H', label: '딱딱', count: 2, ratio: 50 },
      { code: 'T', label: '묽음', count: 1, ratio: 25 },
    ]);
  });

  it('동반 변 상태는 증상이 기록된 날짜별 한 표로 계산한다', () => {
    const hardRecordsOnOneDay = Array.from({ length: 3 }, (_, index) =>
      createBoogleRecord({
        id: BigInt(index + 1),
        regDate: kstDate('2026-07-01', `09:0${index}`),
        stoolBristol: 2,
        stoolSimple: 'H',
        stomach: 'M',
      }),
    );
    const normalRecordsOnTwoDays = [
      createBoogleRecord({
        id: 4n,
        regDate: kstDate('2026-07-02'),
        stoolSimple: 'M',
        stomach: 'M',
      }),
      createBoogleRecord({
        id: 5n,
        regDate: kstDate('2026-07-03'),
        stoolSimple: 'M',
        stomach: 'L',
      }),
    ];

    const result = buildMonthlyPdfData(
      createSourceFixture({
        boogleRecords: [...hardRecordsOnOneDay, ...normalRecordsOnTwoDays],
      }),
    );

    expect(result.discomfortRows[0]).toEqual({
      label: '복통 (약간 이상)',
      count: 5,
      dominantStool: '보통 변',
    });
  });

  it('생활 요인 일수와 식사 태그 상위 2개를 계산한다', () => {
    const result = buildMonthlyPdfData(
      createSourceFixture({
        lifeRecords: [
          createLifeRecord({
            id: 1n,
            regDate: kstDate('2026-07-01'),
            sleep: 'B',
            water: 'L',
            stress: 'H',
            foodTags: [
              { food: { name: '야식' } },
              { food: { name: '유제품' } },
            ],
          }),
          createLifeRecord({
            id: 2n,
            regDate: kstDate('2026-07-02'),
            sleep: 'N',
            water: 'N',
            stress: 'N',
            foodTags: [
              { food: { name: '야식' } },
              { food: { name: '유제품' } },
            ],
          }),
          createLifeRecord({
            id: 3n,
            regDate: kstDate('2026-07-03'),
            sleep: 'G',
            water: 'H',
            stress: 'L',
            foodTags: [{ food: { name: '야식' } }, { food: { name: '음주' } }],
          }),
        ],
      }),
    );

    expect(result.lifeFactorRows).toEqual([
      {
        label: '수면',
        lowCount: 1,
        normalCount: 1,
        highCount: 1,
      },
      {
        label: '수분',
        lowCount: 1,
        normalCount: 1,
        highCount: 1,
      },
      {
        label: '스트레스',
        lowCount: 1,
        normalCount: 1,
        highCount: 1,
      },
    ]);
    expect(result.topFoodTags).toEqual([
      { name: '야식', count: 3 },
      { name: '유제품', count: 2 },
    ]);
  });

  it('KST 날짜로 묶어 최신 배변과 가장 높은 불편감 및 주요 생활을 표시한다', () => {
    const result = buildMonthlyPdfData(
      createSourceFixture({
        startDate: '2026-07-01',
        endDate: '2026-07-03',
        boogleRecords: [
          createBoogleRecord({
            id: 1n,
            regDate: new Date('2026-06-30T15:30:00.000Z'),
            stoolBristol: 2,
            stoolSimple: 'H',
            stomach: 'M',
          }),
          createBoogleRecord({
            id: 2n,
            regDate: new Date('2026-07-01T11:00:00.000Z'),
            stoolBristol: 4,
            stoolSimple: 'M',
            stomach: 'L',
            distension: 'M',
            remainingFeeling: 'L',
            urgency: 'M',
          }),
          createBoogleRecord({
            id: 3n,
            regDate: kstDate('2026-07-02'),
            hasBowel: false,
            stoolBristol: null,
            stoolSimple: null,
          }),
        ],
        lifeRecords: [
          createLifeRecord({
            regDate: kstDate('2026-07-01'),
            sleep: 'B',
            stress: 'H',
            water: 'L',
            mealRegular: 'I',
            foodTags: [
              { food: { name: '음주' } },
              { food: { name: '야식' } },
              { food: { name: '자극적인 음식' } },
              { food: { name: '기름진 음식' } },
              { food: { name: '유제품' } },
            ],
          }),
        ],
      }),
    );

    expect(result.dailyRows).toEqual([
      {
        date: '7/1',
        bowel: '있음',
        stoolState: '보통(4형)',
        discomfort: '복통 심함, 복부팽만 약간, 잔변감 있음, 급박감 약간',
        mainLife:
          '수면 부족, 스트레스 높음, 수분 부족, 식사 불규칙, 음주, 야식, 자극적, 기름진, 유제품',
      },
      {
        date: '7/2',
        bowel: '없음',
        stoolState: '-',
        discomfort: '-',
        mainLife: '-',
      },
      {
        date: '7/3',
        bowel: '없음',
        stoolState: '-',
        discomfort: '-',
        mainLife: '-',
      },
    ]);
  });

  it('감지된 월간 패턴 카드를 그대로 전달한다', () => {
    const patternCard = {
      level: 'WARN' as const,
      ruleCode: 'MONTHLY_LOW_SLEEP',
      title: '수면 부족 반복',
      description: '이번 달 10일 이상 수면이 부족했어요.',
      value: 10,
      threshold: 10,
      unit: 'DAY' as const,
    };

    const result = buildMonthlyPdfData(
      createSourceFixture({
        patternCards: [patternCard],
      }),
    );

    expect(result.patternCards).toEqual([patternCard]);
  });
});
