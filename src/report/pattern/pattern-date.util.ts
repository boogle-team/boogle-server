import { toKstDateKey } from '@/common/utils/kst-date.util';

export function toDateKey(date: Date): string {
  return toKstDateKey(date);
}

export function addUtcDays(date: Date, days: number): Date {
  const copied = new Date(date);
  copied.setUTCDate(copied.getUTCDate() + days);
  return copied;
}

export function isInKstCalendarRange(
  date: Date,
  startCalendarDate: Date,
  endCalendarDateExclusive: Date,
): boolean {
  const dateKey = toKstDateKey(date);
  const startDateKey = startCalendarDate.toISOString().slice(0, 10);
  const endDateKey = endCalendarDateExclusive.toISOString().slice(0, 10);

  return dateKey >= startDateKey && dateKey < endDateKey;
}

export function uniqueDateKeys(dates: Date[]): string[] {
  return [...new Set(dates.map(toDateKey))].sort();
}

export function splitConsecutiveDateKeys(dateKeys: string[]): string[][] {
  const sorted = [...new Set(dateKeys)].sort();
  const groups: string[][] = [];

  for (const dateKey of sorted) {
    const currentGroup = groups.at(-1);

    if (currentGroup === undefined) {
      groups.push([dateKey]);
      continue;
    }

    const previousDate = new Date(`${currentGroup.at(-1)}T00:00:00.000Z`);
    const expectedDateKey = toDateKey(addUtcDays(previousDate, 1));

    if (dateKey === expectedDateKey) {
      currentGroup.push(dateKey);
    } else {
      groups.push([dateKey]);
    }
  }

  return groups;
}

export function longestConsecutiveDays(dateKeys: string[]): number {
  return splitConsecutiveDateKeys(dateKeys).reduce(
    (max, group) => Math.max(max, group.length),
    0,
  );
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}
