import { RetryPolicy, type BackoffOptions } from '@nestjs/resilience';
import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierClient,
  type DeliveryOutcome,
} from '../../modules/carriers/carrier-client.js';
import type { ValidDeliveryNote } from '../../modules/delivery-notes/types/delivery-note.types.js';
import type { ExpresoAndinoClient } from './expreso-andino-client.js';
import {
  fromCreateResponse,
  fromProvincesResponse,
  fromRequestError,
  fromSearchResponse,
  toDeliveryOutcome,
  toShipmentRequest,
  TRANSIENT,
  type Try,
} from './expreso-andino.mapper.js';
import { SHIPMENT_REFERENCE } from './expreso-andino.schemas.js';

export interface ExpresoAndinoCarrierOptions {
  /** Total tries per call, the first included. */
  attempts?: number;
  backoff?: BackoffOptions;
}

const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BACKOFF: BackoffOptions = { delay: '200ms', maxDelay: '2s' };

/** Expreso Andino as the pipeline sees it: its API plus retries, treated as a black box. */
export class ExpresoAndinoCarrier implements CarrierClient {
  private readonly retry: RetryPolicy;

  constructor(
    private readonly api: ExpresoAndinoClient,
    {
      attempts = DEFAULT_ATTEMPTS,
      backoff = DEFAULT_BACKOFF,
    }: ExpresoAndinoCarrierOptions = {},
  ) {
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

  provinces(): Promise<string[]> {
    return this.retry.execute(async ({ signal }) =>
      fromProvincesResponse(await this.api.listProvinces(signal)),
    );
  }

  toShipmentRequest(note: ValidDeliveryNote): JsonObject {
    return toShipmentRequest(note);
  }

  /**
   * Idempotent by `external_ref`. A 500 or a timeout may still have created
   * the shipment, so before sending again the reference is looked up first.
   */
  async deliver(request: JsonObject): Promise<DeliveryOutcome> {
    const { external_ref: reference } = SHIPMENT_REFERENCE.parse(request);
    const result = await this.retry.execute<Try>(
      async ({ attempt, signal }) => {
        const existing =
          attempt > 1 ? await this.findExisting(reference, signal) : undefined;
        return existing ?? this.create(request, signal);
      },
    );
    return toDeliveryOutcome(result);
  }

  private create(request: JsonObject, signal: AbortSignal): Promise<Try> {
    return this.api
      .createShipment(request, signal)
      .then(fromCreateResponse, fromRequestError);
  }

  private findExisting(
    reference: string,
    signal: AbortSignal,
  ): Promise<Try | undefined> {
    return this.api
      .searchShipments(reference, signal)
      .then(fromSearchResponse(reference), fromRequestError);
  }
}
