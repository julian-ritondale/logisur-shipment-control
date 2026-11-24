import { Inject, Injectable } from '@nestjs/common';
import { DeliveryNotesExportNotFoundError } from './delivery-notes.errors.js';
import {
  DELIVERY_NOTES_READER,
  type DeliveryNotesReader,
} from './reader/delivery-notes.reader.js';
import {
  DELIVERY_NOTES_STORAGE,
  type DeliveryNotesStorage,
} from './storage/delivery-notes.storage.js';

export interface DeliveryNotesExport {
  id: string;
  deliveryNotes: Record<string, unknown>[];
}

@Injectable()
export class DeliveryNotesService {
  constructor(
    @Inject(DELIVERY_NOTES_READER) private readonly reader: DeliveryNotesReader,
    @Inject(DELIVERY_NOTES_STORAGE)
    private readonly storage: DeliveryNotesStorage,
  ) {}

  /**
   * Checks that `content` is a readable export, stores it and returns its
   * records. Nothing is stored when the content can't be read.
   */
  async upload(content: Buffer): Promise<DeliveryNotesExport> {
    const deliveryNotes = this.reader.read(content);
    const id = await this.storage.save(content);
    return { id, deliveryNotes };
  }

  /** Reads a stored export and returns its records as they are. */
  async readExport(id: string): Promise<DeliveryNotesExport> {
    const content = await this.storage.read(id);
    if (content === null) {
      throw new DeliveryNotesExportNotFoundError(id);
    }
    return { id, deliveryNotes: this.reader.read(content) };
  }

  /**
   * Returns the records whose `transportista` is the given carrier.
   */
  filterByTransportista(
    deliveryNotes: Record<string, unknown>[],
    transportista: string,
  ): Record<string, unknown>[] {
    void deliveryNotes;
    void transportista;
    throw new Error('Not implemented: filterByTransportista');
  }
}
