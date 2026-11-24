import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DeliveryNotesStorage } from './delivery-notes.storage.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND_CODES = new Set(['ENOENT', 'EISDIR', 'ENOTDIR']);

/** Keeps each export as `<id>.json` in a local directory. */
export class LocalFileDeliveryNotesStorage implements DeliveryNotesStorage {
  constructor(private readonly dir: string) {}

  async save(content: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const id = randomUUID();
    await writeFile(this.pathOf(id), content, { flag: 'wx' });
    return id;
  }

  async read(id: string): Promise<Buffer | null> {
    // Only UUIDs are ids, so nothing else can name a path.
    if (!UUID.test(id)) {
      return null;
    }
    try {
      return await readFile(this.pathOf(id));
    } catch (error) {
      if (NOT_FOUND_CODES.has((error as NodeJS.ErrnoException).code ?? '')) {
        return null;
      }
      throw error;
    }
  }

  private pathOf(id: string): string {
    return join(this.dir, `${id}.json`);
  }
}
