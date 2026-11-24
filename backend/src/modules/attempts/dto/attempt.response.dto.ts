import type { JsonObject } from '../../../common/types/json.js';
import {
  type Cause,
  type Outcome,
  type Reason,
  type Step,
} from '../../../common/types/pipeline.types.js';

/** What happened to one delivery note in one run. */
export class AttemptResponseDto {
  id: string;
  runId: string;
  shipmentId?: string;
  deliveryNoteId: string;
  deliveryNoteNumber?: string;
  /** Zero-based position of the delivery note in its export. */
  position: number;
  fromStep: Step;
  reachedStep: Step;
  outcome: Outcome;
  cause?: Cause;
  reason?: string;
  /** Every problem found, when there was more than one. */
  issues?: Reason[];
  trackingId?: string;
  /** Technical context for support. */
  detail?: JsonObject;
  /** Whether `POST /shipments/:shipmentId/retries` can retry it now. */
  retryable: boolean;
  createdAt: Date;
}
