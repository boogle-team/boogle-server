/**
 * 복통 강도 척도(0~4). 문자 코드(N/M/L)에서 숫자로 변경되며 아래로 매핑된다.
 *   0     → N(없음)
 *   1~2   → M(중간)   ← MILD_MIN
 *   3~4   → L(심함)   ← SEVERE_MIN
 */
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
