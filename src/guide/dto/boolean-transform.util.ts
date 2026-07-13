import type { TransformFnParams } from 'class-transformer';

export const toOptionalBoolean = ({
  value,
}: TransformFnParams): boolean | undefined | string => {
  const rawValue: unknown = value;

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined;
  }

  if (rawValue === true || rawValue === 'true') {
    return true;
  }

  if (rawValue === false || rawValue === 'false') {
    return false;
  }

  return 'INVALID_BOOLEAN_VALUE';
};
