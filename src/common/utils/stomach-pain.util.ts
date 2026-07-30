export const STOMACH_PAIN_SCALE = {
  MIN: 0,
  MILD_MIN: 1,
  SEVERE_MIN: 3,
  MAX: 4,
} as const;

export function isStomachPainAtLeastMild(
  value: number | null | undefined,
): boolean {
  return typeof value === 'number' && value >= STOMACH_PAIN_SCALE.MILD_MIN;
}

export function isSevereStomachPain(value: number | null | undefined): boolean {
  return typeof value === 'number' && value >= STOMACH_PAIN_SCALE.SEVERE_MIN;
}
