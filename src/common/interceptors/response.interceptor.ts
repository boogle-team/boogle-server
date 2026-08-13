import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '@/common/dto/api-response.dto';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';
import type { ResponseMessageResolver } from '@/common/decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const configuredMessage = Reflect.getMetadata(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    ) as unknown;
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message:
          typeof configuredMessage === 'function'
            ? (configuredMessage as ResponseMessageResolver<T>)(data)
            : typeof configuredMessage === 'string'
              ? configuredMessage
              : '요청이 성공적으로 처리되었습니다.',
      })),
    );
  }
}
