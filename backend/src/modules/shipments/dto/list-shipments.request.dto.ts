import { z } from 'zod';
import {
  MAX_NUMBER_LENGTH,
  PAGE_REQUEST_SCHEMA,
} from '../../../common/dto/page.request.dto.js';
import { ShipmentStatus } from '../../../generated/prisma/client.js';
import { Carrier } from '../../carriers/carrier-registry.js';
import { Cause, Step } from '../../../common/types/pipeline.types.js';

export const LIST_SHIPMENTS_REQUEST_SCHEMA = PAGE_REQUEST_SCHEMA.extend({
  status: z.enum(ShipmentStatus).optional(),
  carrier: z.enum(Carrier).optional(),
  /** `nro_remito`. */
  deliveryNoteNumber: z.string().max(MAX_NUMBER_LENGTH).optional(),
  failedStep: z.enum(Step).optional(),
  cause: z.enum(Cause).optional(),
});

export type ListShipmentsRequestDto = z.infer<
  typeof LIST_SHIPMENTS_REQUEST_SCHEMA
>;
