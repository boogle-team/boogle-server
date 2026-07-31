import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserErrorCode } from '../user-error-code.enum';
import { PROFILE_IMAGE_TOO_LARGE_MESSAGE } from '../profile-image.constants';

@Catch(PayloadTooLargeException)
export class ProfileImageUploadExceptionFilter implements ExceptionFilter {
  catch(_: PayloadTooLargeException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      success: false,
      code: UserErrorCode.PROFILE_IMAGE_TOO_LARGE,
      message: PROFILE_IMAGE_TOO_LARGE_MESSAGE,
    });
  }
}
