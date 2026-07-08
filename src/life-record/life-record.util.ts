const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidRegDate(regDate: unknown): regDate is string {
  if (typeof regDate !== 'string' || !DATE_ONLY_PATTERN.test(regDate)) {
    return false;
  }

  const date = new Date(`${regDate}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === regDate
  );
}

// ERD 노트 기준 코드값 (예: sleep - 좋음G/보통N/부족B)
export const LIFE_VALUE_CODES = {
  sleep: ['G', 'N', 'B'],
  stress: ['L', 'N', 'H'],
  water: ['L', 'N', 'H'],
  mealRegular: ['R', 'N', 'I'],
  exercise: ['N', 'L', 'H'],
  caffeine: ['N', 'O', 'M'],
  medicine: ['C', 'V', 'L', 'I', 'B', 'E'],
  outing: ['N', 'L', 'T'],
  hormone: ['N', 'M', 'E'],
} as const;

export type LifeValueField = keyof typeof LIFE_VALUE_CODES;

export function isValidLifeValue(
  field: LifeValueField,
  value?: string | null,
): boolean {
  return (
    value == null ||
    (LIFE_VALUE_CODES[field] as readonly string[]).includes(value)
  );
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19);
}

export function toBigInt(value: number): bigint {
  return BigInt(value);
}

export function toNumberId(value: bigint): number {
  return Number(value);
}
