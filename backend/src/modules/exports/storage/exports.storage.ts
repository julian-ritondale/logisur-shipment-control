export const EXPORTS_STORAGE = Symbol('EXPORTS_STORAGE');

/** Where uploaded exports are kept, byte for byte. */
export interface ExportsStorage {
  /** Stores the content and returns the export's id (a UUID). */
  save(content: Buffer): Promise<string>;

  read(id: string): Promise<Buffer | undefined>;
}
