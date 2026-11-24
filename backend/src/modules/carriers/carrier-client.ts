import type { JsonObject } from '../../common/types/json.js';
import type {
  DeliveryNoteField,
  ValidDeliveryNote,
} from '../delivery-notes/types/delivery-note.types.js';

export const DeliveryStatus = {
  LOADED: 'LOADED',
  REJECTED: 'REJECTED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

/** A problem the carrier found, on one of our fields when it can be told which. */
export interface CarrierRejection {
  field?: DeliveryNoteField;
  message: string;
}

/** How a delivery ended, after the client's own retries. Idempotent: "already had it" is LOADED. */
export type DeliveryOutcome =
  | { status: typeof DeliveryStatus.LOADED; trackingId: string }
  | { status: typeof DeliveryStatus.REJECTED; rejections: CarrierRejection[] }
  | { status: typeof DeliveryStatus.UNAUTHORIZED }
  | { status: typeof DeliveryStatus.UNAVAILABLE; detail: JsonObject };

export type CarrierRequestErrorKind =
  typeof DeliveryStatus.UNAUTHORIZED | typeof DeliveryStatus.UNAVAILABLE;

/** A carrier request that failed outright (e.g. fetching its provinces). */
export class CarrierRequestError extends Error {
  constructor(
    readonly kind: CarrierRequestErrorKind,
    message: string,
    readonly detail: JsonObject = {},
  ) {
    super(message);
    this.name = 'CarrierRequestError';
  }
}

/** Injects the `CarrierClient` of the carrier this deployment delivers to (`CARRIER`). */
export const CARRIER_CLIENT = Symbol('CARRIER_CLIENT');

/** What the pipeline needs from a carrier integration (`src/integrations/<carrier>/`). */
export interface CarrierClient {
  /** Provinces the carrier serves, spelled as it expects them. Throws `CarrierRequestError`. */
  provinces(): Promise<string[]>;

  toShipmentRequest(deliveryNote: ValidDeliveryNote): JsonObject;

  /** Never creates a second shipment for the same delivery note number. */
  deliver(request: JsonObject): Promise<DeliveryOutcome>;
}
