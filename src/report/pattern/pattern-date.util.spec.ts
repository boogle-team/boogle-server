import {
  isInKstCalendarRange,
  splitConsecutiveDateKeys,
} from './pattern-date.util';

describe('pattern-date.util', () => {
  describe('isInKstCalendarRange', () => {
    const startCalendarDateUtc = new Date('2026-07-20T00:00:00.000Z');
    const endCalendarDateExclusiveUtc = new Date('2026-07-27T00:00:00.000Z');

    it('KST 시작일 00시를 포함하고 직전 시각은 제외한다', () => {
      expect(
        isInKstCalendarRange(
          new Date('2026-07-19T14:59:59.999Z'),
          startCalendarDateUtc,
          endCalendarDateExclusiveUtc,
        ),
      ).toBe(false);

      expect(
        isInKstCalendarRange(
          new Date('2026-07-19T15:00:00.000Z'),
          startCalendarDateUtc,
          endCalendarDateExclusiveUtc,
        ),
      ).toBe(true);
    });

    it('KST 마지막 날 끝을 포함하고 다음 날 00시는 제외한다', () => {
      expect(
        isInKstCalendarRange(
          new Date('2026-07-26T14:59:59.999Z'),
          startCalendarDateUtc,
          endCalendarDateExclusiveUtc,
        ),
      ).toBe(true);

      expect(
        isInKstCalendarRange(
          new Date('2026-07-26T15:00:00.000Z'),
          startCalendarDateUtc,
          endCalendarDateExclusiveUtc,
        ),
      ).toBe(false);
    });
  });

  it('날짜 키를 UTC 환경에서도 연속 KST 달력 날짜로 묶는다', () => {
    expect(
      splitConsecutiveDateKeys([
        '2026-07-23',
        '2026-07-20',
        '2026-07-21',
        '2026-07-23',
      ]),
    ).toEqual([['2026-07-20', '2026-07-21'], ['2026-07-23']]);
  });
});
