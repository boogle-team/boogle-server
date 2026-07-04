import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorResponse } from '@/common/dto/api-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const code =
      exception instanceof BusinessException
        ? exception.errorCode
        : `COMMON_${status}`;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const body: ErrorResponse = {
      success: false,
      code,
      message,
    };

    response.status(status).json(body);
  }
}
