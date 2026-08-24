import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.log('EXCEPTION:', exception);

    // ----------------------------------------
    // CSRF error
    // ----------------------------------------
    if (this.isCsrfError(exception)) {
      response.status(HttpStatus.FORBIDDEN).json({
        status: false,
        message: 'Invalid CSRF token.',
        error_code: 'csrf_invalid',
      });

      return;
    }

    // ----------------------------------------
    // NestJS HttpException
    // ----------------------------------------
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (typeof body === 'object' && body !== null) {
      const exceptionBody = body as Record<string, any>;

      response.status(status).json({
        status: false,

        message:
          exceptionBody.message ??
          'Internal server error',

        error_code:
          exceptionBody.code ??
          this.code(status),

        ...(exceptionBody.errors
          ? {
              errors: exceptionBody.errors,
            }
          : {}),
      });

      return;
    }

    response.status(status).json({
      status: false,
      message: String(body),
      error_code: this.code(status),
    });
  }

  private isCsrfError(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      (exception as any).code === 'csrf_invalid'
    );
  }

  private code(status: number): string {
    if (status === 400) return 'validation';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conflict';
    if (status === 429) return 'too_many_requests';

    return 'internal_error';
  }
}