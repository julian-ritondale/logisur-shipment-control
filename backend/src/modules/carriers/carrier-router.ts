import type { CarrierClient } from './carrier-client.js';
import type { Carrier } from './carrier-registry.js';

export const CARRIER_ROUTER = Symbol('CARRIER_ROUTER');

/**
 * Finds the integration that delivers to a carrier. The pipeline never
 * imports an integration directly; it asks the router.
 */
export interface CarrierRouter {
  /** The carrier's client, or `undefined` if there's no integration for it. */
  clientFor(carrier: Carrier): CarrierClient | undefined;
}

export class MapCarrierRouter implements CarrierRouter {
  constructor(
    private readonly clients: Partial<Record<Carrier, CarrierClient>>,
  ) {}

  clientFor(carrier: Carrier): CarrierClient | undefined {
    return this.clients[carrier];
  }
}
