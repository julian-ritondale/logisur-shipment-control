import type { DeliveryNotesExport } from '../delivery-notes.service.js';

/** What the API returns for an uploaded or stored export. */
export class DeliveryNotesExportResponseDto {
  /** Storage id, used with `GET /delivery-notes/:id`. */
  readonly id: string;
  /** Number of delivery notes in the export, duplicates included. */
  readonly count: number;
  /** The delivery notes exactly as exported: not filtered, cleaned or deduplicated. */
  readonly deliveryNotes: Record<string, unknown>[];

  constructor(deliveryNotesExport: DeliveryNotesExport) {
    this.id = deliveryNotesExport.id;
    this.count = deliveryNotesExport.deliveryNotes.length;
    this.deliveryNotes = deliveryNotesExport.deliveryNotes;
  }
}
