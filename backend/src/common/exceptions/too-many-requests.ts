import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(
    message = 'Too many requests. Please try again later.',
  ) {
    super(
      {
        code: 'too_many_requests',
        message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}