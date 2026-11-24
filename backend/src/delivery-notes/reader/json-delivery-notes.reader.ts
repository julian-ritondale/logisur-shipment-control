import { InvalidDeliveryNotesExportError } from '../delivery-notes.errors.js';
import type { DeliveryNotesReader } from './delivery-notes.reader.js';

/** Reads LogiSur's export format: a UTF-8 JSON array of objects. */
export class JsonDeliveryNotesReader implements DeliveryNotesReader {
  read(content: Buffer): Record<string, unknown>[] {
    let text: string;
    try {
      // Fails on invalid UTF-8 instead of garbling accents; drops a BOM.
      text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    } catch {
      throw new InvalidDeliveryNotesExportError(
        'The export is not valid UTF-8',
      );
    }

    if (text.trim() === '') {
      throw new InvalidDeliveryNotesExportError('The export is empty');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new InvalidDeliveryNotesExportError('The export is not valid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new InvalidDeliveryNotesExportError(
        'The export must be a JSON array of delivery notes',
      );
    }

    const invalidIndexes = parsed.flatMap((entry, index) =>
      isRecord(entry) ? [] : [index],
    );
    if (invalidIndexes.length > 0) {
      throw new InvalidDeliveryNotesExportError(
        `Entries at positions ${invalidIndexes.join(', ')} are not delivery notes (JSON objects)`,
      );
    }

    return parsed as Record<string, unknown>[];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
