import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/application.errors.js';

export class ShipmentNotFoundError extends NotFoundError {
  constructor(readonly id: string) {
    super(`Shipment "${id}" not found`);
  }
}

export class ShipmentNotRetryableError extends ConflictError {
  constructor(
    readonly id: string,
    readonly status: string,
  ) {
    super(
      `Shipment "${id}" is ${status.toLowerCase()}; only failed shipments can be retried`,
    );
  }
}
