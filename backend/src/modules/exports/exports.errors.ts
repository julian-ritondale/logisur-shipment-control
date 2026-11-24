import {
  NotFoundError,
  UnprocessableContentError,
} from '../../common/errors/application.errors.js';

export class ExportNotFoundError extends NotFoundError {
  constructor(readonly id: string) {
    super(`Export "${id}" not found`);
  }
}

/** The export's content is not a UTF-8 JSON array of objects. */
export class InvalidExportError extends UnprocessableContentError {}
