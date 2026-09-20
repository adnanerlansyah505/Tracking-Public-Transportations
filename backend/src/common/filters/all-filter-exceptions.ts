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

    const isCsrfError = this.isCsrfError(exception);
    const httpException = this.asHttpException(exception);
    const status = isCsrfError
      ? HttpStatus.FORBIDDEN
      : httpException?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;

    // 4xx responses are ordinary client errors — only real faults get a stack.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('EXCEPTION:', exception);
    }

    // ----------------------------------------
    // CSRF error
    // ----------------------------------------
    if (isCsrfError) {
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
    const body = httpException?.getResponse() ?? 'Internal server error';

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

  /**
   * `instanceof` can fail if a dependency is resolved from a second NestJS
   * package instance. Duck-typing keeps all Nest HTTP exceptions normalized.
   */
  private asHttpException(exception: unknown): HttpException | null {
    if (exception instanceof HttpException) return exception;

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'getStatus' in exception &&
      'getResponse' in exception &&
      typeof (exception as { getStatus?: unknown }).getStatus === 'function' &&
      typeof (exception as { getResponse?: unknown }).getResponse === 'function'
    ) {
      return exception as HttpException;
    }

    return null;
  }

  private code(status: number): string {
    if (status === 400) return 'validation';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conflict';
    if (status === 422) return 'unprocessable_entity';
    if (status === 429) return 'too_many_requests';

    return 'internal_error';
  }
}
