import {
  ApiClient,
  type ApiResponse,
  type Fetch,
} from '../../common/http/api-client.js';
import type { JsonObject } from '../../common/types/json.js';

export interface ExpresoAndinoClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

/**
 * Expreso Andino's shipments API (`expreso-api/API.md`): one method per
 * endpoint, nothing else. What the answers mean is `ExpresoAndinoCarrier`'s job.
 */
export class ExpresoAndinoClient extends ApiClient {
  constructor(
    { baseUrl, apiKey, timeoutMs }: ExpresoAndinoClientOptions,
    fetch?: Fetch,
  ) {
    super({ baseUrl, timeoutMs, fetch, headers: { 'X-Api-Key': apiKey } });
  }

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
