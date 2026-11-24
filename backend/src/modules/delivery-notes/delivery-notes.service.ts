import { Inject, Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import {
  DeliveryNoteNotFoundError,
  ExportNotFoundError,
} from './delivery-notes.errors.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import type { ListDeliveryNotesRequestDto } from './dto/list-delivery-notes.request.dto.js';
import type { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
import {
  DELIVERY_NOTES_READER,
  type DeliveryNotesReader,
} from './reader/delivery-notes.reader.js';
import {
  DELIVERY_NOTES_STORAGE,
  type DeliveryNotesStorage,
} from './storage/delivery-notes.storage.js';
import type {
  ExportSummary,
  StoredDeliveryNote,
} from './types/delivery-note.types.js';

@Injectable()
export class DeliveryNotesService {
  constructor(
    @Inject(DELIVERY_NOTES_READER) private readonly reader: DeliveryNotesReader,
    @Inject(DELIVERY_NOTES_STORAGE)
    private readonly storage: DeliveryNotesStorage,
    private readonly repository: DeliveryNotesRepository,
  ) {}

  /** UPLOAD: stores the export and every delivery note in it. Nothing is stored if it can't be read. */
  async upload(content: Buffer): Promise<ExportSummary> {
    const records = this.reader.read(content);
    const exportId = await this.storage.save(content);
    await this.repository.saveAll(exportId, records);
    return this.getExport(exportId);
  }

  async getExport(id: string): Promise<ExportSummary> {
    const summary = await this.repository.findExport(id);
    if (!summary) {
      throw new ExportNotFoundError(id);
    }
    return summary;
  }

  async listExports({
    after,
    limit,
    uploadedFrom,
    uploadedTo,
  }: ListExportsRequestDto): Promise<PageResponseDto<ExportSummary>> {
    const rows = await this.repository.listExports(
      { uploadedFrom, uploadedTo },
      after,
      limit,
    );
    return toPage(rows, limit, (row) => row);
  }

  async exportContent(id: string): Promise<Buffer> {
    const content = await this.storage.read(id);
    if (!content) {
      throw new ExportNotFoundError(id);
    }
    return content;
  }

  async deliveryNotesOf(exportId: string): Promise<StoredDeliveryNote[]> {
    await this.getExport(exportId);
    return this.repository.deliveryNotesOf(exportId);
  }

  async getDeliveryNote(id: string): Promise<StoredDeliveryNote> {
    const note = await this.repository.findDeliveryNote(id);
    if (!note) {
      throw new DeliveryNoteNotFoundError(id);
    }
    return note;
  }

  async listDeliveryNotes({
    after,
    limit,
    ...filters
  }: ListDeliveryNotesRequestDto): Promise<
    PageResponseDto<StoredDeliveryNote>
  > {
    const rows = await this.repository.listDeliveryNotes(filters, after, limit);
    return toPage(rows, limit, (row) => row);
  }
}
