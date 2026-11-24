import type { JsonObject } from '../../../../common/types/json.js';
import {
  DeliveryStatus,
  type CarrierRejection,
  type DeliveryOutcome,
} from '../../../carriers/carrier-client.js';
import type { CarrierAccess } from '../carrier-access.js';
import { failure, FIELD_LABELS, reason, ReasonCode } from '../reasons.js';
import type { Stage } from '../stage.js';
import { fail, ok, Step, type Result } from '../types/pipeline.types.js';

export interface Delivered {
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
  [S in DeliveryOutcome['status']]: (
    outcome: OutcomeOf<S>,
  ) => Result<Delivered>;
} = {
  DELIVERED: ({ trackingId }) => ok({ trackingId }),
  REJECTED: ({ rejections }) =>
    fail(
      failure(
        Step.DELIVER,
        reason(ReasonCode.REJECTED_BY_CARRIER, { value: describe(rejections) }),
      ),
    ),
  UNAUTHORIZED: () =>
    fail(failure(Step.DELIVER, reason(ReasonCode.INVALID_CARRIER_CREDENTIALS))),
  UNAVAILABLE: ({ detail }) =>
    fail(
      failure(Step.DELIVER, reason(ReasonCode.CARRIER_UNAVAILABLE), { detail }),
    ),
};

export const fromDeliveryOutcome = (
  outcome: DeliveryOutcome,
): Result<Delivered> => RESULTS[outcome.status](outcome as never);

/** DELIVER: sends the request through the carrier's idempotent client. */
export const deliverer = (
  carrier: CarrierAccess,
): Stage<JsonObject, Delivered> => ({
  step: Step.DELIVER,
  run: async (request) => {
    const blocked =
      carrier.missing(Step.DELIVER) ?? carrier.refused(Step.DELIVER);
    if (blocked) {
      return fail(blocked);
    }
    const outcome = await carrier.client!.deliver(request);
    if (outcome.status === DeliveryStatus.UNAUTHORIZED) {
      carrier.refuse(
        failure(Step.DELIVER, reason(ReasonCode.INVALID_CARRIER_CREDENTIALS)),
      );
    }
    return fromDeliveryOutcome(outcome);
  },
});
