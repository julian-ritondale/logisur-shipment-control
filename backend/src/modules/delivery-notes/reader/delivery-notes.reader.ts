import type { RawDeliveryNote } from '../types/delivery-note.types.js';

export const DELIVERY_NOTES_READER = Symbol('DELIVERY_NOTES_READER');

export interface DeliveryNotesReader {
  /** Throws `InvalidExportError` when the content can't be read. */
  read(content: Buffer): RawDeliveryNote[];
}
