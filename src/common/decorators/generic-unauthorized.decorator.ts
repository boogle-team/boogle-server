import { SetMetadata } from '@nestjs/common';

export const GENERIC_UNAUTHORIZED_KEY = 'genericUnauthorized';

export const GenericUnauthorized = () =>
  SetMetadata(GENERIC_UNAUTHORIZED_KEY, true);
