import type { JsonObject } from '../../../common/types/json.js';
import type {
  CarrierStatus,
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
  loadedAt?: Date;
  /** The carrier's tracking status at the last status check (`POST /shipments/status-checks`). */
  carrierStatus?: CarrierStatus;
  /** `YYYY-MM-DD`, from the carrier. */
  estimatedDelivery?: string;
  statusCheckedAt?: Date;
  /** Past its estimated delivery and not delivered to the customer. */
  late: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ShipmentDetailResponseDto extends ShipmentResponseDto {
  /** Output of NORMALIZE. */
  normalized?: NormalizedDeliveryNote;
  /** Output of MAP: what is sent to the carrier. */
  payload?: JsonObject;
}
