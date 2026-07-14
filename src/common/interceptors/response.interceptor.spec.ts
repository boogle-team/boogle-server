import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const next: CallHandler = {
    handle: () => of({ agreed: true }),
  };

  it('uses endpoint-specific response message metadata', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(
      RESPONSE_MESSAGE_KEY,
      '민감정보 수집 동의 상태 조회에 성공했습니다.',
      handler,
    );
    const context = {
      getHandler: () => handler,
    } as unknown as ExecutionContext;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      success: true,
      data: { agreed: true },
      message: '민감정보 수집 동의 상태 조회에 성공했습니다.',
    });
  });

  it('keeps the default message when endpoint metadata is absent', async () => {
    const context = {
      getHandler: () => () => undefined,
    } as unknown as ExecutionContext;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      success: true,
      data: { agreed: true },
      message: '요청이 성공적으로 처리되었습니다.',
    });
  });

  it('resolves a response message from returned data', async () => {
    const handler = () => undefined;
    Reflect.defineMetadata(
      RESPONSE_MESSAGE_KEY,
      (data: { agreed: boolean }) =>
        data.agreed ? '동의했습니다.' : '철회했습니다.',
      handler,
    );
    const context = {
      getHandler: () => handler,
    } as unknown as ExecutionContext;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toMatchObject({ message: '동의했습니다.' });
  });
});
