import { HttpStatus } from '@nestjs/common';
import type { ApiResponse } from '../../common/http/api-client.js';
import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierRejection,
  type DeliveryOutcome,
} from '../../modules/carriers/carrier-client.js';
import { Service } from '../../modules/delivery-notes/schemas/delivery-note.schemas.js';
import type {
  DeliveryNoteField,
  ValidDeliveryNote,
} from '../../modules/delivery-notes/types/delivery-note.types.js';
import {
  PROVINCES,
  SEARCH,
  SHIPMENT,
  VALIDATION_ERROR,
} from './expreso-andino.schemas.js';

/** Our remitos ↔ Expreso Andino's API: request bodies out, answers in. */

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

const delivered = (trackingId: string): Try => ({
  status: DeliveryStatus.DELIVERED,
  trackingId,
});

const created = (body: unknown): Try => {
  const shipment = SHIPMENT.safeParse(body);
  return shipment.success
    ? delivered(shipment.data.tracking_id)
    : transient({ reason: 'no tracking_id in the answer' });
};

const rejected = (body: unknown): Try => ({
  status: DeliveryStatus.REJECTED,
  rejections: (VALIDATION_ERROR.safeParse(body).data?.details ?? []).map(
    ({ field, message }): CarrierRejection =>
      Object.hasOwn(FIELDS, field)
        ? { field: FIELDS[field], message }
        : { message: `${field}: ${message}` },
  ),
});

/** `POST /v1/shipments` answers; anything else (500, 503, ...) is transient. 409 means it already exists: delivered. */
const CREATE_ANSWERS: Partial<Record<number, (body: unknown) => Try>> = {
  [HttpStatus.CREATED]: created,
  [HttpStatus.CONFLICT]: created,
  [HttpStatus.UNPROCESSABLE_ENTITY]: rejected,
  [HttpStatus.UNAUTHORIZED]: () => ({ status: DeliveryStatus.UNAUTHORIZED }),
};

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
    return match && delivered(match.tracking_id);
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
