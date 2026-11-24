import type { RawDeliveryNote } from '../../delivery-notes/types/delivery-note.types.js';

export const EXPORTS_READER = Symbol('EXPORTS_READER');

export interface ExportsReader {
  /** Throws `InvalidExportError` when the content can't be read. */
  read(content: Buffer): RawDeliveryNote[];
}
