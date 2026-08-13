import type {
  BoogleRecordForReport,
  LifeRecordForReport,
} from '../dto/report-record.dto';
import {
  calculateMonthlyScores,
  calculateReportScores,
} from './report-score.calculator';

type BoogleOverrides = Partial<
  Omit<BoogleRecordForReport, 'id' | 'regDate' | 'bowelMovementAt'>
>;

function kstDate(dateKey: string, time = '09:00'): Date {
  return new Date(`${dateKey}T${time}:00.000+09:00`);
}

function createBoogleRecord(
  id: bigint,
  regDate: Date,
  bowelMovementAt: Date | null,
  overrides: BoogleOverrides = {},
): BoogleRecordForReport {
  return {
    id,
    regDate,
    bowelMovementAt,
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

function createLifeRecord(id: bigint, regDate: Date): LifeRecordForReport {
  return {
    id,
    regDate,
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
  };
}

describe('report-score.calculator', () => {
  it('기록 완성도는 Boogle과 Life의 KST 고유 기록일을 합쳐 계산한다', () => {
    const boogleRecords = [
      createBoogleRecord(1n, kstDate('2026-07-01'), null, {
        hasBowel: false,
      }),
      createBoogleRecord(2n, kstDate('2026-07-01', '18:00'), null, {
        hasBowel: false,
      }),
    ];
    const lifeRecords = [
      createLifeRecord(1n, kstDate('2026-07-02')),
      createLifeRecord(2n, kstDate('2026-07-03')),
    ];

    const result = calculateReportScores(boogleRecords, lifeRecords, 7);

    expect(result.completionScore).toBe(42.9);
  });

  it('리듬 점수는 regDate가 아니라 bowelMovementAt을 기준으로 계산한다', () => {
    const regDate = kstDate('2026-07-01', '09:00');
    const boogleRecords = [
      createBoogleRecord(1n, regDate, kstDate('2026-07-01', '08:00')),
      createBoogleRecord(2n, regDate, kstDate('2026-07-01', '09:30')),
      createBoogleRecord(3n, regDate, kstDate('2026-07-01', '21:00')),
    ];

    const result = calculateReportScores(boogleRecords, [], 1);

    expect(result).toEqual({
      completionScore: 100,
      rhythmScore: 66.7,
      stateScore: 100,
      conditionScore: 90,
    });
  });

  it('bowelMovementAt이 없는 배변 기록은 리듬 점수 분모에서도 제외한다', () => {
    const boogleRecords = [
      createBoogleRecord(
        1n,
        kstDate('2026-07-01', '08:00'),
        kstDate('2026-07-01', '08:00'),
      ),
      createBoogleRecord(2n, kstDate('2026-07-01', '21:00'), null),
    ];

    const result = calculateReportScores(boogleRecords, [], 1);

    expect(result.rhythmScore).toBe(100);
  });

  it('유효한 배변 시각이 하나도 없으면 리듬 점수 기본값은 50이다', () => {
    const boogleRecords = [
      createBoogleRecord(1n, kstDate('2026-07-01'), null),
      createBoogleRecord(2n, kstDate('2026-07-02'), null),
    ];

    const result = calculateReportScores(boogleRecords, [], 2);

    expect(result.rhythmScore).toBe(50);
  });

  it('자정을 사이에 둔 배변 시각은 원형 시간 거리로 계산한다', () => {
    const boogleRecords = [
      createBoogleRecord(
        1n,
        kstDate('2026-07-01'),
        kstDate('2026-07-01', '23:30'),
      ),
      createBoogleRecord(
        2n,
        kstDate('2026-07-02'),
        kstDate('2026-07-02', '01:00'),
      ),
    ];

    const result = calculateReportScores(boogleRecords, [], 2);

    expect(result.rhythmScore).toBe(100);
  });

  it('상태 안정도는 Bristol 3~4와 Bristol 미입력 시 simple M을 정상 변으로 센다', () => {
    const boogleRecords = [
      createBoogleRecord(
        1n,
        kstDate('2026-07-01'),
        kstDate('2026-07-01', '08:00'),
        {
          stoolBristol: 4,
          stoolSimple: 'M',
        },
      ),
      createBoogleRecord(
        2n,
        kstDate('2026-07-02'),
        kstDate('2026-07-02', '08:00'),
        {
          stoolBristol: 2,
          stoolSimple: 'H',
        },
      ),
      createBoogleRecord(
        3n,
        kstDate('2026-07-03'),
        kstDate('2026-07-03', '08:00'),
        {
          stoolBristol: null,
          stoolSimple: 'M',
        },
      ),
    ];

    const result = calculateReportScores(boogleRecords, [], 3);

    expect(result.stateScore).toBe(66.7);
  });

  it('기록이 없으면 리듬과 상태 기본값을 반영해 컨디션 점수 30을 반환한다', () => {
    expect(calculateReportScores([], [], 7)).toEqual({
      completionScore: 0,
      rhythmScore: 50,
      stateScore: 50,
      conditionScore: 30,
    });
  });

  it('월간 점수는 30일을 기록 완성도 분모로 사용한다', () => {
    const result = calculateMonthlyScores(
      [
        createBoogleRecord(
          1n,
          kstDate('2026-07-01'),
          kstDate('2026-07-01', '08:00'),
        ),
      ],
      [],
    );

    expect(result.completionScore).toBe(3.3);
  });
});
