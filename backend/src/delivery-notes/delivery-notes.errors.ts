import {
  NotFoundError,
  UnprocessableContentError,
} from '../common/errors/application.errors.js';

export class DeliveryNotesExportNotFoundError extends NotFoundError {
  constructor(readonly id: string) {
    super(`Delivery notes export "${id}" not found`);
  }
}

/** The export's content is not a UTF-8 JSON array of objects. */
export class InvalidDeliveryNotesExportError extends UnprocessableContentError {}
