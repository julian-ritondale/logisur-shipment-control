import type { JsonObject } from '../../../../common/types/json.js';
import {
  DeliveryStatus,
  type CarrierRejection,
  type DeliveryOutcome,
} from '../../../carriers/carrier-client.js';
import type { CarrierAccess } from '../carrier-access.js';
import { failure, FIELD_LABELS, reason } from '../reasons.js';
import type { Stage } from '../stage.js';
import { fail, ok, type Result } from '../types/pipeline.types.js';
import { Cause, Step } from '../../../../common/types/pipeline.types.js';

export interface Loaded {
  trackingId: string;
}

const describe = (rejections: CarrierRejection[]) =>
  rejections
    .map(({ field, message }) =>
      field ? `${FIELD_LABELS[field]}: ${message}` : message,
    )
    .join('; ');

type OutcomeOf<S> = Extract<DeliveryOutcome, { status: S }>;

const RESULTS: {
  [S in DeliveryOutcome['status']]: (outcome: OutcomeOf<S>) => Result<Loaded>;
} = {
  LOADED: ({ trackingId }) => ok({ trackingId }),
  REJECTED: ({ rejections }) =>
    fail(
      failure(
        Step.DELIVER,
        reason(Cause.REJECTED_BY_CARRIER, { value: describe(rejections) }),
      ),
    ),
  UNAUTHORIZED: () =>
    fail(failure(Step.DELIVER, reason(Cause.INVALID_CARRIER_CREDENTIALS))),
  UNAVAILABLE: ({ detail }) =>
    fail(failure(Step.DELIVER, reason(Cause.CARRIER_UNAVAILABLE), { detail })),
};

export const fromDeliveryOutcome = (outcome: DeliveryOutcome): Result<Loaded> =>
  RESULTS[outcome.status](outcome as never);

/** DELIVER: sends the request through the carrier's idempotent client. */
export const deliverer = (
  carrier: CarrierAccess,
): Stage<JsonObject, Loaded> => ({
  step: Step.DELIVER,
  run: async (request) => {
    const blocked = carrier.refused(Step.DELIVER);
    if (blocked) {
      return fail(blocked);
    }
    const outcome = await carrier.client.deliver(request);
    if (outcome.status === DeliveryStatus.UNAUTHORIZED) {
      carrier.refuse(
        failure(Step.DELIVER, reason(Cause.INVALID_CARRIER_CREDENTIALS)),
      );
    }
    return fromDeliveryOutcome(outcome);
  },
});
