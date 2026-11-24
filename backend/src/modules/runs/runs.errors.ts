import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/application.errors.js';

export class RunNotFoundError extends NotFoundError {
  constructor(readonly id: string) {
    super(`Run "${id}" not found`);
  }
}

export class NothingToRetryError extends ConflictError {
  constructor(readonly id: string) {
    super(`"${id}" has no failed shipments left to retry`);
  }
}
