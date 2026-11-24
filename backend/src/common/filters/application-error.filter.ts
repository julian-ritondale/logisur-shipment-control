import {
  ArgumentsHost,
  Catch,
  HttpStatus,
  type HttpException,
  type Type,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  HttpErrorByCode,
  type ErrorHttpStatusCode,
} from '@nestjs/common/utils/http-error-by-code.util.js';
import {
  ApplicationError,
  ConflictError,
  NotFoundError,
  UnprocessableContentError,
} from '../errors/application.errors.js';

/** Each kind of `ApplicationError` and the status it is answered with. A new kind is one more row. */
const STATUS_BY_KIND: ReadonlyArray<
  [
    kind: abstract new (...args: never[]) => ApplicationError,
    ErrorHttpStatusCode,
  ]
> = [
  [NotFoundError, HttpStatus.NOT_FOUND],
  [UnprocessableContentError, HttpStatus.UNPROCESSABLE_ENTITY],
  [ConflictError, HttpStatus.CONFLICT],
];

/**
 * Translates the errors services throw into Nest's HTTP exceptions (through
 * Nest's own `HttpErrorByCode` table) and lets Nest's built-in filter answer,
 * so every error has Nest's standard body (`{ statusCode, message, error }`).
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
  const status = STATUS_BY_KIND.find(([kind]) => error instanceof kind)?.[1];
  if (status === undefined) {
    // An unmapped kind is a bug: Nest answers 500 and logs it.
    return undefined;
  }
  const Exception = HttpErrorByCode[status] as Type<HttpException>;
  return new Exception(error.message, { cause: error });
}
