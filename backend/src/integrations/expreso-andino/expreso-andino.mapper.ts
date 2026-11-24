import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { ApiResponse } from '../../common/http/api-client.js';
import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  CarrierStatus,
  DeliveryStatus,
  type CarrierRejection,
  type DeliveryOutcome,
  type Tracking,
} from '../../modules/carriers/carrier-client.js';
import { Service } from '../../modules/delivery-notes/schemas/delivery-note.schemas.js';
import type {
  DeliveryNoteField,
  ValidDeliveryNote,
} from '../../modules/delivery-notes/types/delivery-note.types.js';

/** Our remitos ↔ Expreso Andino's API (`expreso-api/API.md`): request bodies out, answers in. */

// Response bodies, as API.md describes them.
/** `GET /v1/provinces` → 200. */
const PROVINCES = z.object({ provinces: z.array(z.string()) });
/** `POST /v1/shipments` → 201, and 409 (duplicate), which carries the existing one. */
const SHIPMENT = z.object({ tracking_id: z.string() });
/** `POST /v1/shipments` → 422. */
const VALIDATION_ERROR = z.object({
  error: z.string().optional(),
  details: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .default([]),
});
/** `GET /v1/shipments?external_ref=` → 200. */
const SEARCH = z.object({
  items: z.array(
    z.object({ tracking_id: z.string(), external_ref: z.string() }),
  ),
});
/** `GET /v1/shipments/{tracking_id}` → 200. */
const TRACKING = z.object({
  status: z.enum(CarrierStatus),
  estimated_delivery: z.iso.date().optional(),
});
/** The one field of a `POST /v1/shipments` body we read back. */
const SHIPMENT_REFERENCE = z.object({ external_ref: z.string() });

const SERVICES: Record<Service, string> = {
  [Service.STANDARD]: 'standard',
  [Service.EXPRESS]: 'express',
};

/** The API's field names (`API.md`) → ours. */
const FIELDS: Record<string, DeliveryNoteField> = {
  external_ref: 'number',
  'recipient.name': 'recipientName',
  'recipient.street': 'street',
  'recipient.city': 'city',
  'recipient.province': 'province',
  'recipient.zip_code': 'postalCode',
  'recipient.phone': 'phone',
  packages: 'packages',
  weight_kg: 'weightKg',
  declared_value: 'declaredValue',
  service: 'service',
};

/** A try that failed transiently: the retry policy tries again. */
export const TRANSIENT = 'TRANSIENT';
export type Try =
  DeliveryOutcome | { status: typeof TRANSIENT; detail: JsonObject };

const transient = (detail: JsonObject): Try => ({ status: TRANSIENT, detail });

const loaded = (trackingId: string): Try => ({
  status: DeliveryStatus.LOADED,
  trackingId,
});

const created = (body: unknown): Try => {
  const shipment = SHIPMENT.safeParse(body);
  return shipment.success
    ? loaded(shipment.data.tracking_id)
    : transient({ reason: 'no tracking_id in the answer' });
};

/** Without details, the rejection still says something: the API's `error`, or that it gave no reason. */
const NO_DETAILS = 'no details given';

const rejected = (body: unknown): Try => {
  const { error, details } = VALIDATION_ERROR.safeParse(body).data ?? {
    details: [],
  };
  const rejections = details.map(({ field, message }): CarrierRejection =>
    Object.hasOwn(FIELDS, field)
      ? { field: FIELDS[field], message }
      : { message: `${field}: ${message}` },
  );
  return {
    status: DeliveryStatus.REJECTED,
    rejections:
      rejections.length > 0 ? rejections : [{ message: error ?? NO_DETAILS }],
  };
};

/** `POST /v1/shipments` answers; anything else (500, 503, ...) is transient. 409 means it already exists: loaded. */
const CREATE_ANSWERS: Partial<Record<number, (body: unknown) => Try>> = {
  [HttpStatus.CREATED]: created,
  [HttpStatus.CONFLICT]: created,
  [HttpStatus.UNPROCESSABLE_ENTITY]: rejected,
  [HttpStatus.UNAUTHORIZED]: () => ({ status: DeliveryStatus.UNAUTHORIZED }),
};

/** The `external_ref` of a stored `POST /v1/shipments` body. */
export const referenceOf = (shipment: JsonObject): string =>
  SHIPMENT_REFERENCE.parse(shipment).external_ref;

export const toShipmentRequest = (note: ValidDeliveryNote): JsonObject => ({
  external_ref: note.number,
  recipient: {
    name: note.recipient.name,
    street: note.recipient.street,
    city: note.recipient.city,
    province: note.recipient.province,
    zip_code: note.recipient.postalCode,
    phone: note.recipient.phone,
  },
  packages: note.packages,
  weight_kg: note.weightKg,
  declared_value: note.declaredValue,
  service: SERVICES[note.service],
});

/** `GET /v1/provinces`. Throws `CarrierRequestError`: UNAUTHORIZED is final, UNAVAILABLE is retried. */
export const fromProvincesResponse = ({
  status,
  ok,
  body,
}: ApiResponse): string[] => {
  if (status === HttpStatus.UNAUTHORIZED) {
    throw new CarrierRequestError(
      DeliveryStatus.UNAUTHORIZED,
      'API key refused',
    );
  }
  const provinces = PROVINCES.safeParse(body);
  if (!ok || !provinces.success) {
    throw new CarrierRequestError(
      DeliveryStatus.UNAVAILABLE,
      `GET /v1/provinces answered ${status}`,
      { status },
    );
  }
  return provinces.data.provinces;
};

/** `GET /v1/shipments/{tracking_id}`. Throws `CarrierRequestError`: UNAUTHORIZED is final, UNAVAILABLE is retried. */
export const fromShipmentResponse = ({
  status,
  ok,
  body,
}: ApiResponse): Tracking => {
  if (status === HttpStatus.UNAUTHORIZED) {
    throw new CarrierRequestError(
      DeliveryStatus.UNAUTHORIZED,
      'API key refused',
    );
  }
  const tracking = TRACKING.safeParse(body);
  if (!ok || !tracking.success) {
    throw new CarrierRequestError(
      DeliveryStatus.UNAVAILABLE,
      `GET /v1/shipments/{tracking_id} answered ${status}`,
      { status },
    );
  }
  return {
    status: tracking.data.status,
    estimatedDelivery: tracking.data.estimated_delivery,
  };
};

export const fromCreateResponse = ({ status, body }: ApiResponse): Try =>
  CREATE_ANSWERS[status]?.(body) ?? transient({ status });

/** `GET /v1/shipments?external_ref=`: the shipment for `reference`, a failure, or `undefined` if there's none. */
export const fromSearchResponse =
  (reference: string) =>
  ({ status, ok, body }: ApiResponse): Try | undefined => {
    if (status === HttpStatus.UNAUTHORIZED) {
      return { status: DeliveryStatus.UNAUTHORIZED };
    }
    const search = SEARCH.safeParse(body);
    if (!ok || !search.success) {
      return transient({ status });
    }
    const match = search.data.items.find(
      (item) => item.external_ref === reference,
    );
    return match && loaded(match.tracking_id);
  };

/** A network error or a timeout: the request may or may not have arrived. */
export const fromRequestError = (error: unknown): Try =>
  transient(
    error instanceof Error
      ? { error: error.name, message: error.message }
      : { error: String(error) },
  );

/** The last try, once the retries are spent. */
export const toDeliveryOutcome = (result: Try): DeliveryOutcome =>
  result.status === TRANSIENT
    ? { status: DeliveryStatus.UNAVAILABLE, detail: result.detail }
    : result;
