import { HttpStatus } from '@nestjs/common';
import { RetryPolicy, type BackoffOptions } from '@nestjs/resilience';
import { z } from 'zod';
import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierClient,
  type CarrierRejection,
  type DeliveryOutcome,
} from '../../modules/carriers/carrier-client.js';
import { Service } from '../../modules/delivery-notes/schemas/delivery-note.schemas.js';
import type {
  DeliveryNoteField,
  ValidDeliveryNote,
} from '../../modules/delivery-notes/types/delivery-note.types.js';

export interface ExpresoAndinoClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  /** Total tries per call, the first included. */
  attempts?: number;
  backoff?: BackoffOptions;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BACKOFF: BackoffOptions = { delay: '200ms', maxDelay: '2s' };
const TRAILING_SLASHES = /\/+$/;

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

const SHIPMENT = z.object({ tracking_id: z.string() });
const VALIDATION_ERROR = z.object({
  details: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .default([]),
});
const SEARCH = z.object({
  items: z.array(
    z.object({ tracking_id: z.string(), external_ref: z.string() }),
  ),
});
const PROVINCES = z.object({ provinces: z.array(z.string()) });
const REFERENCE = z.object({ external_ref: z.string() });

/** A try that failed transiently: the retry policy tries again. */
const TRANSIENT = 'TRANSIENT';
type Try = DeliveryOutcome | { status: typeof TRANSIENT; detail: JsonObject };

const delivered = (body: unknown): Try => {
  const shipment = SHIPMENT.safeParse(body);
  return shipment.success
    ? {
        status: DeliveryStatus.DELIVERED,
        trackingId: shipment.data.tracking_id,
      }
    : { status: TRANSIENT, detail: { reason: 'no tracking_id in the answer' } };
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
  [HttpStatus.CREATED]: delivered,
  [HttpStatus.CONFLICT]: delivered,
  [HttpStatus.UNPROCESSABLE_ENTITY]: rejected,
  [HttpStatus.UNAUTHORIZED]: () => ({ status: DeliveryStatus.UNAUTHORIZED }),
};

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/** Expreso Andino's shipments API (`expreso-api/API.md`), as a black box: failures are handled generically. */
export class ExpresoAndinoClient implements CarrierClient {
  private readonly retry: RetryPolicy;
  private readonly baseUrl: string;

  constructor(
    private readonly options: ExpresoAndinoClientOptions,
    private readonly fetchFn: Fetch = (input, init) => fetch(input, init),
  ) {
    this.baseUrl = options.baseUrl.replace(TRAILING_SLASHES, '');
    this.retry = new RetryPolicy({
      name: 'expreso-andino',
      attempts: options.attempts ?? DEFAULT_ATTEMPTS,
      backoff: options.backoff ?? DEFAULT_BACKOFF,
      retryIf: (error) =>
        !(
          error instanceof CarrierRequestError &&
          error.kind === DeliveryStatus.UNAUTHORIZED
        ),
      retryOnResult: (result) => (result as Try).status === TRANSIENT,
    });
  }

  provinces(): Promise<string[]> {
    return this.retry.execute(async ({ signal }) => {
      const response = await this.request('GET', '/v1/provinces', signal);
      if (response.status === HttpStatus.UNAUTHORIZED) {
        throw new CarrierRequestError(
          DeliveryStatus.UNAUTHORIZED,
          'API key refused',
        );
      }
      const body = PROVINCES.safeParse(await readBody(response));
      if (!response.ok || !body.success) {
        throw new CarrierRequestError(
          DeliveryStatus.UNAVAILABLE,
          `GET /v1/provinces answered ${response.status}`,
          {
            status: response.status,
          },
        );
      }
      return body.data.provinces;
    });
  }

  toShipmentRequest(note: ValidDeliveryNote): JsonObject {
    return {
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
    };
  }

  /**
   * Idempotent by `external_ref`. A 500 or a timeout may still have created
   * the shipment, so before sending again the reference is looked up first.
   */
  async deliver(request: JsonObject): Promise<DeliveryOutcome> {
    const { external_ref: reference } = REFERENCE.parse(request);
    const result = await this.retry.execute<Try>(
      async ({ attempt, signal }) => {
        const existing =
          attempt > 1 ? await this.lookUp(reference, signal) : undefined;
        return existing ?? this.create(request, signal);
      },
    );
    return result.status === TRANSIENT
      ? { status: DeliveryStatus.UNAVAILABLE, detail: result.detail }
      : result;
  }

  private async create(request: JsonObject, signal: AbortSignal): Promise<Try> {
    try {
      const response = await this.request(
        'POST',
        '/v1/shipments',
        signal,
        request,
      );
      const answer = CREATE_ANSWERS[response.status];
      const body = await readBody(response);
      return answer
        ? answer(body)
        : { status: TRANSIENT, detail: { status: response.status } };
    } catch (error) {
      return { status: TRANSIENT, detail: describe(error) };
    }
  }

  /** The existing shipment for `reference`, a transient failure, or `undefined` if there's none. */
  private async lookUp(
    reference: string,
    signal: AbortSignal,
  ): Promise<Try | undefined> {
    try {
      const response = await this.request(
        'GET',
        `/v1/shipments?external_ref=${encodeURIComponent(reference)}`,
        signal,
      );
      if (response.status === HttpStatus.UNAUTHORIZED) {
        return { status: DeliveryStatus.UNAUTHORIZED };
      }
      const search = SEARCH.safeParse(await readBody(response));
      if (!response.ok || !search.success) {
        return { status: TRANSIENT, detail: { status: response.status } };
      }
      const match = search.data.items.find(
        (item) => item.external_ref === reference,
      );
      return (
        match && {
          status: DeliveryStatus.DELIVERED,
          trackingId: match.tracking_id,
        }
      );
    } catch (error) {
      return { status: TRANSIENT, detail: describe(error) };
    }
  }

  private request(
    method: string,
    path: string,
    signal: AbortSignal,
    body?: JsonObject,
  ): Promise<Response> {
    return this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.options.apiKey,
        Accept: 'application/json',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      ]),
    });
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const describe = (error: unknown): JsonObject =>
  error instanceof Error
    ? { error: error.name, message: error.message }
    : { error: String(error) };
