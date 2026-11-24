import {
  CarrierRequestError,
  DeliveryStatus,
  type CarrierClient,
} from '../../carriers/carrier-client.js';
import { failure, reason } from './reasons.js';
import type { Failure } from './types/pipeline.types.js';
import { Cause, type Step } from '../../../common/types/pipeline.types.js';

/**
 * The carrier as one run sees it: its client, its provinces (fetched once per run, failures included), and whether it
 * refused our credentials (then the run stops calling it).
 */
export interface CarrierAccess {
  readonly client: CarrierClient;
  refused(step: Step): Failure | undefined;
  refuse(failure: Failure): void;
  provinces(): Promise<ReadonlySet<string>>;
}

export function carrierAccess(client: CarrierClient): CarrierAccess {
  let provinces: Promise<ReadonlySet<string>> | undefined;
  let refusal: Failure | undefined;

  return {
    client,
    refused: (step) => refusal && { ...refusal, step },
    refuse: (why) => {
      refusal = why;
    },
    provinces: () => {
      provinces ??= client.provinces().then((list) => new Set(list));
      return provinces;
    },
  };
}

const CARRIER_ERROR_REASONS = {
  [DeliveryStatus.UNAUTHORIZED]: Cause.INVALID_CARRIER_CREDENTIALS,
  [DeliveryStatus.UNAVAILABLE]: Cause.CARRIER_UNAVAILABLE,
};

/** The business reason for a carrier request that failed outright. */
export function fromCarrierError(step: Step, error: unknown): Failure {
  if (!(error instanceof CarrierRequestError)) {
    return failure(step, reason(Cause.CARRIER_UNAVAILABLE), {
      detail: { error: String(error) },
    });
  }
  return failure(step, reason(CARRIER_ERROR_REASONS[error.kind]), {
    detail: { message: error.message, ...error.detail },
  });
}
