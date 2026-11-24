import { InvalidExportError } from '../exports.errors.js';
import { EXPORT_SCHEMA } from '../../delivery-notes/schemas/delivery-note.schemas.js';
import type { RawDeliveryNote } from '../../delivery-notes/types/delivery-note.types.js';
import type { ExportsReader } from './exports.reader.js';

const ERRORS = {
  NOT_UTF8: 'The export is not valid UTF-8',
  EMPTY: 'The export is empty',
  NOT_JSON: 'The export is not valid JSON',
  NOT_AN_ARRAY: 'The export must be a JSON array of delivery notes',
  notObjects: (positions: number[]) =>
    `Entries at positions ${positions.join(', ')} are not delivery notes (JSON objects)`,
};

/** LogiSur's export format: a UTF-8 JSON array of objects. */
export class JsonExportsReader implements ExportsReader {
  read(content: Buffer): RawDeliveryNote[] {
    const json = parseJson(decode(content));
    const parsed = EXPORT_SCHEMA.safeParse(json);
    if (parsed.success) {
      return parsed.data;
    }
    const positions = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
    ].filter((key) => typeof key === 'number');
    throw new InvalidExportError(
      positions.length > 0 ? ERRORS.notObjects(positions) : ERRORS.NOT_AN_ARRAY,
    );
  }
}

/** Strict UTF-8, so accents are never garbled; a BOM is dropped. */
function decode(content: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    throw new InvalidExportError(ERRORS.NOT_UTF8);
  }
}

function parseJson(text: string): unknown {
  if (text.trim() === '') {
    throw new InvalidExportError(ERRORS.EMPTY);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidExportError(ERRORS.NOT_JSON);
  }
}
