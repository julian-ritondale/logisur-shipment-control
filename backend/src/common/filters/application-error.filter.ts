import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
  UnprocessableContentError,
} from '../errors/application.errors.js';

/**
 * Translates the errors services throw into Nest's HTTP exceptions and lets
 * Nest's built-in filter answer, so every error has Nest's standard body
 * (`{ statusCode, message, error }`).
 *
 * Only `ApplicationError`s are caught here: `HttpException`s (validation,
 * missing upload, file too large, ...) and unexpected errors (500, logged)
 * are already handled by Nest's default exception handler.
 */
@Catch(ApplicationError)
export class ApplicationErrorFilter extends BaseExceptionFilter {
  override catch(error: ApplicationError, host: ArgumentsHost): void {
    super.catch(toHttpException(error) ?? error, host);
  }
}

function toHttpException(error: ApplicationError): HttpException | undefined {
  if (error instanceof NotFoundError) {
    return new NotFoundException(error.message, { cause: error });
  }
  if (error instanceof UnprocessableContentError) {
    return new UnprocessableEntityException(error.message, { cause: error });
  }
  if (error instanceof ConflictError) {
    return new ConflictException(error.message, { cause: error });
  }
  // An unmapped kind is a bug: Nest answers 500 and logs it.
  return undefined;
}
