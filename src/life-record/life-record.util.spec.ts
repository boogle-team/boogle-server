import { formatDateOnly } from './life-record.util';

describe('formatDateOnly', () => {
  it('KST 자정 경계 시각(전날 15:00:00.000Z)은 다음 날짜로 포맷된다', () => {
    expect(formatDateOnly(new Date('2026-07-01T15:00:00.000Z'))).toBe(
      '2026-07-02',
    );
  });

  it('KST 자정 1ms 전(전날 14:59:59.999Z)은 그 전날 날짜로 포맷된다', () => {
    expect(formatDateOnly(new Date('2026-07-01T14:59:59.999Z'))).toBe(
      '2026-07-01',
    );
  });
});
