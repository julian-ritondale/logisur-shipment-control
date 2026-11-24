/** Injection token for the `DeliveryNotesStorage` implementation. */
export const DELIVERY_NOTES_STORAGE = Symbol('DELIVERY_NOTES_STORAGE');

/**
 * Where uploaded exports are kept, as raw bytes. The implementation is picked
 * by the module `DeliveryNotesModule` imports (see ADR 0004).
 */
export interface DeliveryNotesStorage {
  /** Stores the content and returns its id (a UUID). */
  save(content: Buffer): Promise<string>;

  /** Returns the content stored under `id`, or `null` if there is none. */
  read(id: string): Promise<Buffer | null>;
}
