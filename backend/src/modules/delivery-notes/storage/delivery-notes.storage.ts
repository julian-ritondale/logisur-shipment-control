export const DELIVERY_NOTES_STORAGE = Symbol('DELIVERY_NOTES_STORAGE');

/** Where uploaded exports are kept, byte for byte. */
export interface DeliveryNotesStorage {
  /** Stores the content and returns the export's id (a UUID). */
  save(content: Buffer): Promise<string>;

  read(id: string): Promise<Buffer | undefined>;
}
