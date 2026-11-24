import { z } from 'zod';
import {
  MAX_NUMBER_LENGTH,
  PAGE_REQUEST_SCHEMA,
} from '../../../common/dto/page.request.dto.js';
import { Cause, Outcome, Step } from '../../../common/types/pipeline.types.js';

export const LIST_ATTEMPTS_REQUEST_SCHEMA = PAGE_REQUEST_SCHEMA.extend({
  runId: z.uuidv4().optional(),
  shipmentId: z.uuidv4().optional(),
  outcome: z.enum(Outcome).optional(),
  /** Where the attempt stopped. */
  step: z.enum(Step).optional(),
  cause: z.enum(Cause).optional(),
  /** `nro_remito`. */
  deliveryNoteNumber: z.string().max(MAX_NUMBER_LENGTH).optional(),
});

export type ListAttemptsRequestDto = z.infer<
  typeof LIST_ATTEMPTS_REQUEST_SCHEMA
>;
