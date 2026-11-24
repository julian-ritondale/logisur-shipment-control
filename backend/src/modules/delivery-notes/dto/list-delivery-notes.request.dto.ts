import { z } from 'zod';
import {
  MAX_NUMBER_LENGTH,
  PAGE_REQUEST_SCHEMA,
} from '../../../common/dto/page.request.dto.js';
import { Carrier } from '../../carriers/carrier-registry.js';

export const LIST_DELIVERY_NOTES_REQUEST_SCHEMA = PAGE_REQUEST_SCHEMA.extend({
  exportId: z.uuidv4().optional(),
  /** `nro_remito`. */
  number: z.string().max(MAX_NUMBER_LENGTH).optional(),
  carrier: z.enum(Carrier).optional(),
});

export type ListDeliveryNotesRequestDto = z.infer<
  typeof LIST_DELIVERY_NOTES_REQUEST_SCHEMA
>;
