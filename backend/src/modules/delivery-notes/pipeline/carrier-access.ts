import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierClient,
} from '../../carriers/carrier-client.js';
import { carrierName, type Carrier } from '../../carriers/carrier-registry.js';
import { failure, reason, ReasonCode } from './reasons.js';
import type { Failure, Step } from './types/pipeline.types.js';

/**
 * The carrier as one run sees it: its client (if there's an integration),
 * its provinces (fetched once per run, failures included), and whether it
 * refused our credentials (then the run stops calling it).
 */
export interface CarrierAccess {
  readonly client?: CarrierClient;
  missing(step: Step): Failure | undefined;
  refused(step: Step): Failure | undefined;
  refuse(failure: Failure): void;
  provinces(): Promise<ReadonlySet<string>>;
}

export function carrierAccess(
  carrier: Carrier,
  client?: CarrierClient,
): CarrierAccess {
  let provinces: Promise<ReadonlySet<string>> | undefined;
  let refusal: Failure | undefined;

  return {
    client,
    missing: (step) =>
      client
        ? undefined
        : failure(
            step,
            reason(ReasonCode.NO_CARRIER_INTEGRATION, {
              carrier: carrierName(carrier),
            }),
          ),
    refused: (step) => refusal && { ...refusal, step },
    refuse: (why) => {
      refusal = why;
    },
    provinces: () => {
      provinces ??= client
        ? client.provinces().then((list) => new Set(list))
        : Promise.reject(new Error('No carrier integration'));
      return provinces;
    },
  };
}

const CARRIER_ERROR_REASONS = {
  [DeliveryStatus.UNAUTHORIZED]: ReasonCode.INVALID_CARRIER_CREDENTIALS,
  [DeliveryStatus.UNAVAILABLE]: ReasonCode.CARRIER_UNAVAILABLE,
};

/** The business reason for a carrier request that failed outright. */
export function fromCarrierError(step: Step, error: unknown): Failure {
  if (!(error instanceof CarrierRequestError)) {
    return failure(step, reason(ReasonCode.CARRIER_UNAVAILABLE), {
      detail: { error: String(error) },
    });
  }
  return failure(step, reason(CARRIER_ERROR_REASONS[error.kind]), {
    detail: { message: error.message, ...error.detail },
  });
}
