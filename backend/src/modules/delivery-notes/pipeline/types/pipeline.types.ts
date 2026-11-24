import type { JsonObject } from '../../../../common/types/json.js';
import type { ReasonCode } from '../reasons.js';

/** Values match the Prisma enum `PipelineStep`. */
export const Step = {
  UPLOAD: 'UPLOAD',
  NORMALIZE: 'NORMALIZE',
  FILTER: 'FILTER',
  VALIDATE: 'VALIDATE',
  MAP: 'MAP',
  DELIVER: 'DELIVER',
} as const;

export type Step = (typeof Step)[keyof typeof Step];

export const STEPS = Object.values(Step);

/** Values match the Prisma enum `AttemptOutcome`. */
export const Outcome = {
  DELIVERED: 'DELIVERED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
} as const;

export type Outcome = (typeof Outcome)[keyof typeof Outcome];

export const OUTCOMES = Object.values(Outcome);

export interface Reason {
  code: ReasonCode;
  message: string;
}

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
