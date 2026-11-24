import type { JsonObject } from '../../../common/types/json.js';
import type {
  PipelineStep,
  ShipmentStatus,
} from '../../../generated/prisma/client.js';
import type { NormalizedDeliveryNote } from '../../delivery-notes/types/delivery-note.types.js';
import { type Cause } from '../../../common/types/pipeline.types.js';

/** A delivery note on its way to a carrier. Its attempts: `GET /attempts?shipmentId=`. */
export class ShipmentResponseDto {
  id: string;
  carrier: string;
  carrierName: string;
  deliveryNoteId: string;
  deliveryNoteNumber: string;
  status: ShipmentStatus;
  lastCompletedStep?: PipelineStep;
  failedStep?: PipelineStep;
  cause?: Cause;
  reason?: string;
  trackingId?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ShipmentDetailResponseDto extends ShipmentResponseDto {
  /** Output of NORMALIZE. */
  normalized?: NormalizedDeliveryNote;
  /** Output of MAP: what is sent to the carrier. */
  payload?: JsonObject;
}
