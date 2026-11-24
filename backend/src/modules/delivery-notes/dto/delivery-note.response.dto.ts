import type { Carrier } from '../../carriers/carrier-registry.js';
import type { RawDeliveryNote } from '../types/delivery-note.types.js';

export class DeliveryNoteResponseDto {
  id: string;
  exportId: string;
  /** Zero-based position in the export. */
  position: number;
  number?: string;
  carrier?: Carrier;
  raw: RawDeliveryNote;
}
