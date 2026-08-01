import type { BoogleRecordForReport } from '../dto/report-record.dto';
import { hasBowelMovementAt } from './bowel-record.util';

function createRecord(
  bowelMovementAt: Date | null,
  hasBowel = true,
): BoogleRecordForReport {
  return {
    id: 1n,
    regDate: new Date('2026-07-31T00:00:00.000Z'),
    bowelMovementAt,
    hasBowel,
    stoolBristol: 4,
    stoolSimple: 'M',
    bowelFeeling: null,
    stomach: 0,
    distension: null,
    remainingFeeling: null,
    urgency: null,
    takenTime: null,
    amount: null,
  };
}

describe('hasBowelMovementAt', () => {
  it('배변했고 유효한 Date가 있으면 true를 반환한다', () => {
    const record = createRecord(new Date('2026-07-31T08:30:00.000+09:00'));

    expect(hasBowelMovementAt(record)).toBe(true);
  });

  it.each([null, undefined, new Date(Number.NaN)])(
    '유효하지 않은 배변 시각 %p는 false를 반환한다',
    (value) => {
      // Prisma 타입 밖의 런타임 입력도 type guard가 안전하게 거부하는지 확인한다.
      const record = {
        ...createRecord(null),
        bowelMovementAt: value,
      } as unknown as BoogleRecordForReport;

      expect(hasBowelMovementAt(record)).toBe(false);
    },
  );

  it('hasBowel이 false면 시각이 있어도 false를 반환한다', () => {
    const record = createRecord(
      new Date('2026-07-31T08:30:00.000+09:00'),
      false,
    );

    expect(hasBowelMovementAt(record)).toBe(false);
  });
});
