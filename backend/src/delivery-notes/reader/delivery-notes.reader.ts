/** Injection token for the `DeliveryNotesReader` implementation. */
export const DELIVERY_NOTES_READER = Symbol('DELIVERY_NOTES_READER');

/**
 * Turns an export's raw content into its delivery notes, untouched (not
 * filtered, cleaned or deduplicated). The implementation is picked by the
 * module `DeliveryNotesModule` imports (see ADR 0004).
 */
export interface DeliveryNotesReader {
  /** Throws `InvalidDeliveryNotesExportError` when the content can't be read. */
  read(content: Buffer): Record<string, unknown>[];
}
