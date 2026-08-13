const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const ISO_DATE_TIME_WITH_ZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function toKstDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function kstDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000+09:00`);
}

export function addKstDateKeyDays(dateKey: string, days: number): string {
  const calendarDate = new Date(`${dateKey}T00:00:00.000Z`);
  calendarDate.setUTCDate(calendarDate.getUTCDate() + days);
  return calendarDate.toISOString().slice(0, 10);
}

export function kstNextDayStart(dateKey: string): Date {
  return kstDayStart(addKstDateKeyDays(dateKey, 1));
}

export function getTodayKstDateKey(now = new Date()): string {
  return toKstDateKey(now);
}

export function getKstHour(date: Date): number {
  return new Date(date.getTime() + KST_OFFSET_MS).getUTCHours();
}

export function getKstMinute(date: Date): number {
  return new Date(date.getTime() + KST_OFFSET_MS).getUTCMinutes();
}

export function getKstTimeInHours(date: Date): number {
  return getKstHour(date) + getKstMinute(date) / 60;
}

/**
 * 시각을 KST 기준 `HH:mm` 문자열로 변환한다(부글 기록의 배변 시각 표시용).
 *
 * boogle_record.reg_date는 "어느 날짜의 기록인지"만 담아 KST 자정으로 저장되므로
 * (= UTC 15:00), 실제 배변 시각은 bowel_movement_at을 이 형식으로 내려줘야 한다.
 */
export function toKstHourMinute(date: Date | null): string | null {
  if (date === null) {
    return null;
  }

  const hour = String(getKstHour(date)).padStart(2, '0');
  const minute = String(getKstMinute(date)).padStart(2, '0');

  return `${hour}:${minute}`;
}

export function toKstDateTime(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);

  return `${kst.toISOString().slice(0, 10)}T${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}:${String(kst.getUTCSeconds()).padStart(2, '0')}`;
}
