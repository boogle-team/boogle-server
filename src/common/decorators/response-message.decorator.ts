import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

export type ResponseMessageResolver<T = unknown> = (data: T) => string;

export const ResponseMessage = <T = unknown>(
  message: string | ResponseMessageResolver<T>,
) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
