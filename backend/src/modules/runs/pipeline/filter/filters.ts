import {
  FieldStatus,
  rawOf,
  valueOf,
  type Field,
} from '../../../../common/types/field.js';
import { Carrier, carrierName } from '../../../carriers/carrier-registry.js';
import type { NormalizedDeliveryNote } from '../../../delivery-notes/types/delivery-note.types.js';
import { reason } from '../reasons.js';
import { contentHash, stableStringify } from './content-hash.js';
import {
  Cause,
  Outcome,
  type Reason,
} from '../../../../common/types/pipeline.types.js';

export interface Candidate {
  deliveryNoteId: string;
  position: number;
  normalized: NormalizedDeliveryNote;
}

/** What a filter decided for a delivery note it took out of the run. */
export type Decision =
  | { outcome: typeof Outcome.SKIPPED; reason: Reason }
  | { outcome: typeof Outcome.FAILED; reason: Reason }
  | {
      outcome: typeof Outcome.LOADED;
      shipmentId: string;
      trackingId: string;
    };

export interface Decided {
  candidate: Candidate;
  decision: Decision;
}

export interface FilterResult {
  kept: Candidate[];
  decided: Decided[];
}

/** Sees every candidate still in play, so it can compare them, and keeps or decides each. */
export type Filter = (candidates: readonly Candidate[]) => FilterResult;

/** Runs filters left to right; each sees only what the previous ones kept. */
export const composeFilters =
  (...filters: Filter[]): Filter =>
  (candidates) =>
    filters.reduce<FilterResult>(
      (result, filter) => {
        const next = filter(result.kept);
        return {
          kept: next.kept,
          decided: [...result.decided, ...next.decided],
        };
      },
      { kept: [...candidates], decided: [] },
    );

/** A filter from a per-candidate decision; `undefined` keeps the candidate. */
const each =
  (decide: (candidate: Candidate) => Decision | undefined): Filter =>
  (candidates) => {
    const result: FilterResult = { kept: [], decided: [] };
    for (const candidate of candidates) {
      const decision = decide(candidate);
      if (decision) {
        result.decided.push({ candidate, decision });
      } else {
        result.kept.push(candidate);
      }
    }
    return result;
  };

const skip = (why: Reason): Decision => ({
  outcome: Outcome.SKIPPED,
  reason: why,
});
const stop = (why: Reason): Decision => ({
  outcome: Outcome.FAILED,
  reason: why,
});

const numberOf = (candidate: Candidate) => valueOf(candidate.normalized.number);

type CarrierMatch =
  | 'WANTED'
  | 'PICKUP'
  | 'OTHER'
  | typeof FieldStatus.MISSING
  | typeof FieldStatus.INVALID;

const matchCarrier = (field: Field<Carrier>, wanted: Carrier): CarrierMatch => {
  if (field.status !== FieldStatus.VALID) {
    return field.status;
  }
  if (field.value === wanted) {
    return 'WANTED';
  }
  return field.value === Carrier.CUSTOMER_PICKUP ? 'PICKUP' : 'OTHER';
};

const CARRIER_DECISIONS: Record<
  CarrierMatch,
  (field: Field<Carrier>) => Decision | undefined
> = {
  WANTED: () => undefined,
  PICKUP: () => skip(reason(Cause.CUSTOMER_PICKUP)),
  OTHER: (field) =>
    skip(
      reason(Cause.OTHER_CARRIER, {
        carrier: carrierName(valueOf(field)!),
      }),
    ),
  MISSING: () => stop(reason(Cause.MISSING_CARRIER)),
  INVALID: (field) =>
    stop(reason(Cause.UNKNOWN_CARRIER, { value: rawOf(field) })),
};

export const byCarrier = (carrier: Carrier): Filter =>
  each(({ normalized }) =>
    CARRIER_DECISIONS[matchCarrier(normalized.carrier, carrier)](
      normalized.carrier,
    ),
  );

/** Without a number there's no reference for the carrier, so nothing can be sent. */
export const hasNumber = (): Filter =>
  each((candidate) =>
    numberOf(candidate) === undefined
      ? stop(reason(Cause.MISSING_DELIVERY_NOTE_NUMBER))
      : undefined,
  );

/** Identical copies are sent once. Copies with different data all fail: none is guessed. */
export const dedupeWithinExport = (): Filter => (candidates) => {
  const groups = Map.groupBy(
    candidates,
    (candidate) => numberOf(candidate) ?? candidate.deliveryNoteId,
  );
  const decisions = new Map<Candidate, Decision>();

  for (const [number, group] of groups) {
    const identical =
      new Set(group.map((c) => stableStringify(c.normalized))).size === 1;
    const params = { value: number, count: group.length };
    group.forEach((candidate, index) => {
      if (!identical) {
        decisions.set(
          candidate,
          stop(reason(Cause.CONFLICTING_DUPLICATE, params)),
        );
      } else if (index > 0) {
        decisions.set(
          candidate,
          skip(reason(Cause.DUPLICATE_IN_EXPORT, params)),
        );
      }
    });
  }

  return each((candidate) => decisions.get(candidate))(candidates);
};

export interface LoadedShipment {
  shipmentId: string;
  trackingId: string;
  contentHash: string;
}

/**
 * Delivery notes an earlier run already loaded. With the same data they are
 * loaded (idempotently); with different data they fail, since the carrier has the old version.
 */
export const alreadyLoaded = (
  loaded: ReadonlyMap<string, LoadedShipment>,
): Filter =>
  each((candidate) => {
    const previous = loaded.get(numberOf(candidate) ?? '');
    if (!previous) {
      return undefined;
    }
    return previous.contentHash === contentHash(candidate.normalized)
      ? {
          outcome: Outcome.LOADED,
          shipmentId: previous.shipmentId,
          trackingId: previous.trackingId,
        }
      : stop(
          reason(Cause.LOADED_WITH_DIFFERENT_DATA, {
            value: previous.trackingId,
          }),
        );
  });
