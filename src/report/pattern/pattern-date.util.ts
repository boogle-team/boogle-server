export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const copied = new Date(date);
  copied.setUTCDate(copied.getUTCDate() + days);
  return copied;
}

export function isInRange(
  date: Date,
  start: Date,
  endExclusive: Date,
): boolean {
  return date >= start && date < endExclusive;
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
