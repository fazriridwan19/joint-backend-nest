import { HttpException } from '@nestjs/common';
import { BusinessErrorCode } from '../business-error-code';

export class ApiException extends HttpException {
  constructor(
    code: BusinessErrorCode,
    status: number,
    message: string,
    details?: Array<{ field: string; issue: string; message: string }>,
  ) {
    super({ code, message, details: details ?? null }, status);
  }
}
