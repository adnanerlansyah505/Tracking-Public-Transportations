import { NestFactory, Reflector } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-filter-exceptions';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { getValidationMessage } from './common/validation/validation-messages';
import { doubleCsrfProtection } from './common/guards/csrf';
import { csrfSession } from './common/guards/csrf-session';

/**
 * Builds the fully configured Nest application.
 *
 * Kept separate from `main.ts` so the long-running server (local dev) and the
 * Vercel request handler (serverless) share one configuration. Pass an existing
 * Express instance to mount the app onto it, which is what the serverless
 * handler needs.
 */
export async function createApp(existingServer?: Express): Promise<NestExpressApplication> {
  const app = existingServer
    ? await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(existingServer),
      )
    : await NestFactory.create<NestExpressApplication>(AppModule);

  // Cookies must be initialized before CSRF middleware
  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,

    exceptionFactory: (
      validationErrors: ValidationError[],
    ) => {
      const errors = validationErrors.reduce(
        (acc, error) => {
          acc[error.property] =
            getValidationMessage(error);

          return acc;
        },
        {} as Record<string, string>,
      );

      return new BadRequestException({
        code: 'validation',
        message: 'Validation failed',
        errors,
      });
    },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Config
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:4000');

  // Cors
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  // Create/read CSRF session
  app.use(csrfSession);

  // Validate CSRF token
  app.use(doubleCsrfProtection);

  // Set the base API path prefix globally
  app.setGlobalPrefix('api/v1');

  return app;
}
