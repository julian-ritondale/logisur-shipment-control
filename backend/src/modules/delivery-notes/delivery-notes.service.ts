import { Inject, Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import {
  DeliveryNoteNotFoundError,
  ExportNotFoundError,
} from './delivery-notes.errors.js';
import {
  fromListDeliveryNotesRequestDto,
  fromListExportsRequestDto,
  toDeliveryNoteDto,
  toExportDto,
} from './delivery-notes.mapper.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
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
  async upload(content: Buffer): Promise<ExportResponseDto> {
    const records = this.reader.read(content);
    const exportId = await this.storage.save(content);
    await this.repository.saveAll(exportId, records);
    return this.getExport(exportId);
  }

  async getExport(id: string): Promise<ExportResponseDto> {
    return toExportDto(await this.findExport(id));
  }

  async listExports(
    request: ListExportsRequestDto,
  ): Promise<PageResponseDto<ExportResponseDto>> {
    const { filters, after, limit } = fromListExportsRequestDto(request);
    return toPage(
      await this.repository.listExports(filters, after, limit),
      limit,
      toExportDto,
    );
  }

  async exportContent(id: string): Promise<Buffer> {
    const content = await this.storage.read(id);
    if (!content) {
      throw new ExportNotFoundError(id);
    }
    return content;
  }

  /** The export's delivery notes, for the pipeline. */
  async deliveryNotesOf(exportId: string): Promise<StoredDeliveryNote[]> {
    await this.findExport(exportId);
    return this.repository.deliveryNotesOf(exportId);
  }

  async getDeliveryNote(id: string): Promise<DeliveryNoteResponseDto> {
    const note = await this.repository.findDeliveryNote(id);
    if (!note) {
      throw new DeliveryNoteNotFoundError(id);
    }
    return toDeliveryNoteDto(note);
  }

  async listDeliveryNotes(
    request: ListDeliveryNotesRequestDto,
  ): Promise<PageResponseDto<DeliveryNoteResponseDto>> {
    const { filters, after, limit } = fromListDeliveryNotesRequestDto(request);
    return toPage(
      await this.repository.listDeliveryNotes(filters, after, limit),
      limit,
      toDeliveryNoteDto,
    );
  }

  private async findExport(id: string): Promise<ExportSummary> {
    const summary = await this.repository.findExport(id);
    if (!summary) {
      throw new ExportNotFoundError(id);
    }
    return summary;
  }
}
