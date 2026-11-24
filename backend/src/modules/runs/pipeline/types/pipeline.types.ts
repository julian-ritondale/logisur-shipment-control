import type { JsonObject } from '../../../../common/types/json.js';
import type { Reason, Step } from '../../../../common/types/pipeline.types.js';

/** Why a delivery note stopped, and where. */
export interface Failure extends Reason {
  step: Step;
  /** Every problem found, when there was more than one. */
  issues?: Reason[];
  /** Technical context for support. Never shown as the reason. */
  detail?: JsonObject;
}

export type Result<T> =
  { ok: true; value: T } | { ok: false; failure: Failure };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T = never>(failure: Failure): Result<T> => ({
  ok: false,
  failure,
});
