import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '@/common/exceptions/business.exception';
import { CommonErrorCode } from '@/common/constants/common-error-code.enum';
import { ErrorResponse } from '@/common/dto/api-response.dto';

const DEFAULT_ERROR_BY_STATUS: Record<
  number,
  { code: CommonErrorCode; message: string }
> = {
  [HttpStatus.BAD_REQUEST]: {
    code: CommonErrorCode.BAD_REQUEST,
    message: '요청 값이 올바르지 않습니다.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: CommonErrorCode.UNAUTHORIZED,
    message: '로그인이 필요합니다.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: CommonErrorCode.FORBIDDEN,
    message: '해당 요청을 처리할 권한이 없습니다.',
  },
  [HttpStatus.NOT_FOUND]: {
    code: CommonErrorCode.NOT_FOUND,
    message: '요청한 데이터를 찾을 수 없습니다.',
  },
  [HttpStatus.METHOD_NOT_ALLOWED]: {
    code: CommonErrorCode.METHOD_NOT_ALLOWED,
    message: '허용되지 않은 요청 메서드입니다.',
  },
  [HttpStatus.CONFLICT]: {
    code: CommonErrorCode.CONFLICT,
    message: '이미 존재하는 데이터입니다.',
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    code: CommonErrorCode.UNPROCESSABLE_ENTITY,
    message: '처리할 수 없는 요청입니다.',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: CommonErrorCode.TOO_MANY_REQUESTS,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    code: CommonErrorCode.INTERNAL_SERVER_ERROR,
    message: '서버 내부 오류가 발생했습니다.',
  },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const fallback =
      DEFAULT_ERROR_BY_STATUS[status] ??
      DEFAULT_ERROR_BY_STATUS[HttpStatus.INTERNAL_SERVER_ERROR];

    const body: ErrorResponse =
      exception instanceof BusinessException
        ? {
            success: false,
            code: exception.errorCode,
            message: exception.message,
            ...(exception.data === undefined ? {} : { data: exception.data }),
          }
        : {
            success: false,
            code: fallback.code,
            message: fallback.message,
          };

    response.status(status).json(body);
  }
}
