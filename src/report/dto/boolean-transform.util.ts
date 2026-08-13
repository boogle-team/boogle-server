export const toOptionalBoolean = (
  value: unknown,
): boolean | undefined | string => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return 'INVALID_BOOLEAN_VALUE';
};
