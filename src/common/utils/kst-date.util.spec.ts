import {
  getKstHour,
  getKstMinute,
  getKstTimeInHours,
  getTodayKstDateKey,
  kstDayStart,
  toKstDateKey,
} from './kst-date.util';

describe('kst-date.util', () => {
  it('UTC instant를 KST 날짜 키로 변환한다', () => {
    expect(toKstDateKey(new Date('2026-07-19T15:30:00.000Z'))).toBe(
      '2026-07-20',
    );
  });

  it('KST 날짜 자정을 UTC instant로 반환한다', () => {
    expect(kstDayStart('2026-07-20').toISOString()).toBe(
      '2026-07-19T15:00:00.000Z',
    );
  });

  it('KST 시각을 반환한다', () => {
    const date = new Date('2026-07-19T23:30:00.000Z');

    expect(getKstHour(date)).toBe(8);
    expect(getKstMinute(date)).toBe(30);
    expect(getKstTimeInHours(date)).toBe(8.5);
  });

  it('KST 자정 이후의 오늘 날짜를 반환한다', () => {
    expect(getTodayKstDateKey(new Date('2026-07-19T15:30:00.000Z'))).toBe(
      '2026-07-20',
    );
  });
});
