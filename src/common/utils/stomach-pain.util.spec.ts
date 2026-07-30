import {
  isSevereStomachPain,
  isStomachPainAtLeastMild,
} from './stomach-pain.util';

describe('stomach-pain.util', () => {
  it.each([
    [null, false, false],
    [0, false, false],
    [1, true, false],
    [2, true, false],
    [3, true, true],
    [4, true, true],
  ] as const)(
    'stomach=%s의 약간 이상=%s, 심함=%s를 판정한다',
    (stomach, expectedMild, expectedSevere) => {
      expect(isStomachPainAtLeastMild(stomach)).toBe(expectedMild);
      expect(isSevereStomachPain(stomach)).toBe(expectedSevere);
    },
  );
});
