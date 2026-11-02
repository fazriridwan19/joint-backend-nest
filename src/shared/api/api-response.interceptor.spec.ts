import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();

  function intercept(data: unknown): Promise<unknown> {
    const handler: CallHandler = { handle: () => of(data) };
    return lastValueFrom(
      interceptor.intercept({} as ExecutionContext, handler),
    );
  }

  it('wraps successful controller results in the standard response envelope', async () => {
    await expect(intercept({ id: 'user-id' })).resolves.toEqual({
      success: true,
      data: { id: 'user-id' },
      error: null,
      meta: null,
    });
  });

  it('does not double-wrap a response that already follows the contract', async () => {
    const response = {
      success: true,
      data: { loggedOut: true },
      error: null,
      meta: null,
    };

    await expect(intercept(response)).resolves.toBe(response);
  });
});
