import { NotFoundError } from '../../common/errors/application.errors.js';

export class DeliveryNoteNotFoundError extends NotFoundError {
  constructor(readonly id: string) {
    super(`Delivery note "${id}" not found`);
  }
}
