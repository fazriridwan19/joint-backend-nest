import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse } from './api-response';

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'success' in value &&
    'data' in value &&
    'error' in value &&
    'meta' in value &&
    typeof value.success === 'boolean'
  );
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          isApiResponse(data) ? data : ApiResponse.success(data),
        ),
      );
  }
}
