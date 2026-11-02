import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ValidationError } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ApiException } from './shared/api/api-exception';
import { ApiExceptionFilter } from './shared/api/api-exception.filter';
import { ApiResponseInterceptor } from './shared/api/api-response.interceptor';
import { BusinessErrorCode } from './shared/business-error-code';

type ApiRequest = Request & { requestId?: string };

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { strict: false });
  app.useBodyParser('urlencoded', { extended: true });
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one allowed origin.');
  }
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept-Language'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.use(
    (request: ApiRequest, response: Response, next: NextFunction): void => {
      request.requestId = randomUUID();
      response.setHeader('X-Request-Id', request.requestId);
      next();
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new ApiException(
          BusinessErrorCode.VALIDATION_ERROR,
          400,
          'Beberapa field tidak valid.',
          errors.flatMap((error) =>
            Object.values(error.constraints ?? {}).map((message) => ({
              field: error.property,
              issue: 'INVALID_FORMAT',
              message,
            })),
          ),
        ),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
