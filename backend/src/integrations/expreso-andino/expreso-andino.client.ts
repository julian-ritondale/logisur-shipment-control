import { RetryPolicy, type BackoffOptions } from '@nestjs/resilience';
import {
  ApiClient,
  type ApiResponse,
  type Fetch,
} from '../../common/http/api-client.js';
import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierClient,
  type DeliveryOutcome,
} from '../../modules/carriers/carrier-client.js';
import type { ValidDeliveryNote } from '../../modules/delivery-notes/types/delivery-note.types.js';
import {
  fromCreateResponse,
  fromProvincesResponse,
  fromRequestError,
  fromSearchResponse,
  referenceOf,
  toDeliveryOutcome,
  toShipmentRequest,
  TRANSIENT,
  type Try,
} from './expreso-andino.mapper.js';

export interface ExpresoAndinoClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  /** Total tries per call, the first included. */
  attempts?: number;
  backoff?: BackoffOptions;
}

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BACKOFF: BackoffOptions = { delay: '200ms', maxDelay: '2s' };

/**
 * Expreso Andino's shipments API (`expreso-api/API.md`), as the pipeline's
 * `CarrierClient`. The API is a black box: failures are handled generically,
 * and what each answer means is in the mapper.
 */
export class ExpresoAndinoClient extends ApiClient implements CarrierClient {
  private readonly retry: RetryPolicy;

  constructor(
    {
      baseUrl,
      apiKey,
      timeoutMs,
      attempts = DEFAULT_ATTEMPTS,
      backoff = DEFAULT_BACKOFF,
    }: ExpresoAndinoClientOptions,
    fetch?: Fetch,
  ) {
    super({ baseUrl, timeoutMs, fetch, headers: { 'X-Api-Key': apiKey } });
    this.retry = new RetryPolicy({
      name: 'expreso-andino',
      attempts,
      backoff,
      retryIf: (error) =>
        !(
          error instanceof CarrierRequestError &&
          error.kind === DeliveryStatus.UNAUTHORIZED
        ),
      retryOnResult: (result) => (result as Try).status === TRANSIENT,
    });
  }

  // CarrierClient

  provinces(): Promise<string[]> {
    return this.retry.execute(async ({ signal }) =>
      fromProvincesResponse(await this.listProvinces(signal)),
    );
  }

  toShipmentRequest(note: ValidDeliveryNote): JsonObject {
    return toShipmentRequest(note);
  }

  /**
   * Idempotent by `external_ref`. A 500 or a timeout may still have created
   * the shipment, so before sending again the reference is looked up first.
   */
  async deliver(shipment: JsonObject): Promise<DeliveryOutcome> {
    const reference = referenceOf(shipment);
    const result = await this.retry.execute<Try>(
      async ({ attempt, signal }) => {
        const existing =
          attempt > 1
            ? await this.searchShipments(reference, signal).then(
                fromSearchResponse(reference),
                fromRequestError,
              )
            : undefined;
        return (
          existing ??
          this.createShipment(shipment, signal).then(
            fromCreateResponse,
            fromRequestError,
          )
        );
      },
    );
    return toDeliveryOutcome(result);
  }

  // Endpoints of API.md, one method each

  /** `GET /v1/provinces` */
  listProvinces(signal?: AbortSignal): Promise<ApiResponse> {
    return this.get('/v1/provinces', { signal });
  }

  /** `POST /v1/shipments` */
  createShipment(
    shipment: JsonObject,
    signal?: AbortSignal,
  ): Promise<ApiResponse> {
    return this.post('/v1/shipments', shipment, { signal });
  }

  /** `GET /v1/shipments?external_ref={ref}` */
  searchShipments(
    externalRef: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse> {
    return this.get('/v1/shipments', {
      query: { external_ref: externalRef },
      signal,
    });
  }

  /** `GET /v1/shipments/{tracking_id}` */
  getShipment(trackingId: string, signal?: AbortSignal): Promise<ApiResponse> {
    return this.get(`/v1/shipments/${encodeURIComponent(trackingId)}`, {
      signal,
    });
  }
}
