import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';
import { BusinessErrorCode } from '../business-error-code';
import { ApiErrorDetail, ApiResponse } from './api-response';

type ApiRequest = Request & { requestId?: string };

const BUSINESS_ERROR_CODES = new Set<string>(Object.values(BusinessErrorCode));

function isBusinessErrorCode(code: string): code is BusinessErrorCode {
  return BUSINESS_ERROR_CODES.has(code);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<ApiRequest>();
    const response = context.getResponse<Response>();
    let status = 500;
    let code = BusinessErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan internal.';
    let details: ApiErrorDetail[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const apiBody = body as {
          code?: unknown;
          message?: unknown;
          details?: unknown;
        };
        if (
          typeof apiBody.code === 'string' &&
          isBusinessErrorCode(apiBody.code)
        ) {
          code = apiBody.code;
        } else {
          code =
            status === 404
              ? BusinessErrorCode.NOT_FOUND
              : status >= 500
                ? BusinessErrorCode.INTERNAL_SERVER_ERROR
                : BusinessErrorCode.HTTP_ERROR;
        }
        details = this.apiErrorDetails(apiBody.details);
        if (typeof apiBody.message === 'string') {
          message = apiBody.message;
        } else if (
          typeof apiBody.message === 'object' &&
          apiBody.message !== null
        ) {
          details ??= this.validationDetails(apiBody.message);
          message =
            status >= 500
              ? 'Terjadi kesalahan internal.'
              : 'Permintaan tidak valid.';
        } else if (typeof body === 'string') {
          message = body;
        } else if (status < 500) {
          message = exception.message || 'Permintaan tidak dapat diproses.';
        }
      } else if (typeof body === 'string' && status < 500) {
        message = body;
        code =
          status === 404
            ? BusinessErrorCode.NOT_FOUND
            : BusinessErrorCode.HTTP_ERROR;
      } else if (status < 500) {
        code =
          status === 404
            ? BusinessErrorCode.NOT_FOUND
            : BusinessErrorCode.HTTP_ERROR;
        message = exception.message || 'Permintaan tidak dapat diproses.';
      }

      if (status >= 500) {
        this.logger.error(exception.message, exception.stack);
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string };
      if (driverError.code === '23505') {
        status = 409;
        code = BusinessErrorCode.DUPLICATE_RESOURCE;
        message = 'Resource sudah terdaftar.';
      } else {
        this.logger.error(exception.message, exception.stack);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const error = {
      code,
      message,
      details,
      requestId: request.requestId ?? 'unknown',
    };
    response.status(status).json(ApiResponse.failure(error));
  }

  private validationDetails(value: object): ApiErrorDetail[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return (value as unknown[]).flatMap((message) =>
      typeof message === 'string'
        ? [{ field: '', issue: 'INVALID_FORMAT', message }]
        : [],
    );
  }

  private apiErrorDetails(value: unknown): ApiErrorDetail[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return (value as unknown[]).filter(isApiErrorDetail);
  }
}

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const detail = value as Record<string, unknown>;
  return (
    typeof detail.field === 'string' &&
    typeof detail.issue === 'string' &&
    typeof detail.message === 'string'
  );
}
