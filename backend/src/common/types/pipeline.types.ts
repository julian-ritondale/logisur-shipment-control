/**
 * The words the delivery pipeline reports in, shared by the modules that
 * read its results (runs, attempts, shipments). The pipeline itself, and the
 * message for each cause, live in `modules/runs/pipeline/`.
 */

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
  LOADED: 'LOADED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
} as const;

export type Outcome = (typeof Outcome)[keyof typeof Outcome];

export const OUTCOMES = Object.values(Outcome);

/** Every way a delivery note can stop: skipped (not for this run) or failed (someone has to look at it). */
export const Cause = {
  // FILTER: not for this run
  OTHER_CARRIER: 'OTHER_CARRIER',
  CUSTOMER_PICKUP: 'CUSTOMER_PICKUP',
  DUPLICATE_IN_EXPORT: 'DUPLICATE_IN_EXPORT',
  IN_PROGRESS_ELSEWHERE: 'IN_PROGRESS_ELSEWHERE',
  // FILTER: someone has to look at it
  MISSING_CARRIER: 'MISSING_CARRIER',
  UNKNOWN_CARRIER: 'UNKNOWN_CARRIER',
  MISSING_DELIVERY_NOTE_NUMBER: 'MISSING_DELIVERY_NOTE_NUMBER',
  CONFLICTING_DUPLICATE: 'CONFLICTING_DUPLICATE',
  LOADED_WITH_DIFFERENT_DATA: 'LOADED_WITH_DIFFERENT_DATA',
  // VALIDATE
  MISSING_RECIPIENT_NAME: 'MISSING_RECIPIENT_NAME',
  MISSING_ADDRESS: 'MISSING_ADDRESS',
  MISSING_CITY: 'MISSING_CITY',
  MISSING_PROVINCE: 'MISSING_PROVINCE',
  UNKNOWN_PROVINCE: 'UNKNOWN_PROVINCE',
  PROVINCE_NOT_SERVED: 'PROVINCE_NOT_SERVED',
  MISSING_POSTAL_CODE: 'MISSING_POSTAL_CODE',
  MISSING_PACKAGES: 'MISSING_PACKAGES',
  INVALID_PACKAGES: 'INVALID_PACKAGES',
  TOO_FEW_PACKAGES: 'TOO_FEW_PACKAGES',
  MISSING_WEIGHT: 'MISSING_WEIGHT',
  INVALID_WEIGHT: 'INVALID_WEIGHT',
  NON_POSITIVE_WEIGHT: 'NON_POSITIVE_WEIGHT',
  INVALID_DECLARED_VALUE: 'INVALID_DECLARED_VALUE',
  NEGATIVE_DECLARED_VALUE: 'NEGATIVE_DECLARED_VALUE',
  MISSING_SERVICE: 'MISSING_SERVICE',
  UNKNOWN_SERVICE: 'UNKNOWN_SERVICE',
  // The carrier side
  REJECTED_BY_CARRIER: 'REJECTED_BY_CARRIER',
  CARRIER_UNAVAILABLE: 'CARRIER_UNAVAILABLE',
  INVALID_CARRIER_CREDENTIALS: 'INVALID_CARRIER_CREDENTIALS',
  // Anything else
  RUN_INTERRUPTED: 'RUN_INTERRUPTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type Cause = (typeof Cause)[keyof typeof Cause];

export const CAUSES = Object.values(Cause);

/** Why a delivery note stopped: its cause, and the message LogiSur reads. */
export interface Reason {
  cause: Cause;
  message: string;
}
