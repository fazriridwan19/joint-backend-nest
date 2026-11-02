import { ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from './api-exception';
import { ApiExceptionFilter } from './api-exception.filter';
import { BusinessErrorCode } from '../business-error-code';

describe('ApiExceptionFilter', () => {
  let filter: ApiExceptionFilter;
  let status: jest.Mock<Response, [number]>;
  let json: jest.Mock<void, [unknown]>;
  let request: { requestId: string };

  beforeEach(() => {
    filter = new ApiExceptionFilter();
    json = jest.fn<void, [unknown]>();
    status = jest.fn<Response, [number]>().mockReturnValue({
      json,
    } as unknown as Response);
    request = { requestId: 'request-id' };
  });

  function createHost(): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ status, json }) as unknown as Response,
      }),
    } as ArgumentsHost;
  }

  it('normalizes business exceptions and preserves status, details, and request id', () => {
    const exception = new ApiException(
      BusinessErrorCode.INVALID_CREDENTIALS,
      401,
      'Password saat ini salah.',
      [
        {
          field: 'currentPassword',
          issue: 'INVALID_FORMAT',
          message: 'invalid',
        },
      ],
    );

    filter.catch(exception, createHost());

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: BusinessErrorCode.INVALID_CREDENTIALS,
        message: 'Password saat ini salah.',
        details: [
          {
            field: 'currentPassword',
            issue: 'INVALID_FORMAT',
            message: 'invalid',
          },
        ],
        requestId: 'request-id',
      },
      meta: null,
    });
  });

  it('normalizes standard Nest HTTP errors', () => {
    filter.catch(new HttpException('Not Found', 404), createHost());

    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0]?.[0]).toEqual({
      success: false,
      data: null,
      error: {
        code: BusinessErrorCode.NOT_FOUND,
        requestId: 'request-id',
        details: null,
        message: 'Not Found',
      },
      meta: null,
    });
  });

  it('hides unexpected error messages and logs the exception', () => {
    const logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('database connection details'), createHost());

    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0]?.[0]).toEqual({
      success: false,
      data: null,
      error: {
        code: BusinessErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Terjadi kesalahan internal.',
        requestId: 'request-id',
        details: null,
      },
      meta: null,
    });
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });
});
