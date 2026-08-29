import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor
  implements NestInterceptor
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response) => {
        // Service returned null/undefined
        if (response === null || response === undefined) {
          return {
            status: true,
            data: null,
          };
        }

        // Service returned only a message
        if (
          typeof response === 'object' &&
          'message' in response &&
          Object.keys(response).every(
            (key) => key === 'message',
          )
        ) {
          return {
            status: true,
            message: response.message,
            data: null,
          };
        }

        // Normal response
        return {
          status: true,
          data: response,
        };
      }),
    );
  }
}