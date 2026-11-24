import { Inject, Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import { DeliveryNotesService } from '../delivery-notes/delivery-notes.service.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
import type { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
import { ExportNotFoundError } from './exports.errors.js';
import { fromListExportsRequestDto, toExportDto } from './exports.mapper.js';
import { ExportsRepository } from './exports.repository.js';
import { EXPORTS_READER, type ExportsReader } from './reader/exports.reader.js';
import {
  EXPORTS_STORAGE,
  type ExportsStorage,
} from './storage/exports.storage.js';

@Injectable()
export class ExportsService {
  constructor(
    @Inject(EXPORTS_READER) private readonly reader: ExportsReader,
    @Inject(EXPORTS_STORAGE) private readonly storage: ExportsStorage,
    private readonly exports: ExportsRepository,
    private readonly deliveryNotes: DeliveryNotesService,
  ) {}

  /** UPLOAD: stores the export and every delivery note in it. Nothing is stored if it can't be read. */
  async upload(content: Buffer): Promise<ExportResponseDto> {
    const records = this.reader.read(content);
    const id = await this.storage.save(content);
    await this.deliveryNotes.saveAll(id, records);
    return this.get(id);
  }

  async get(id: string): Promise<ExportResponseDto> {
    const summary = await this.exports.find(id);
    if (!summary) {
      throw new ExportNotFoundError(id);
    }
    return toExportDto(summary);
  }

  async list(
    request: ListExportsRequestDto,
  ): Promise<PageResponseDto<ExportResponseDto>> {
    const { filters, after, limit } = fromListExportsRequestDto(request);
    return toPage(
      await this.exports.list(filters, after, limit),
      limit,
      toExportDto,
    );
  }

  async content(id: string): Promise<Buffer> {
    const content = await this.storage.read(id);
    if (!content) {
      throw new ExportNotFoundError(id);
    }
    return content;
  }
}
