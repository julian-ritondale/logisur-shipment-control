import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import { DeliveryNoteNotFoundError } from './delivery-notes.errors.js';
import {
  fromListDeliveryNotesRequestDto,
  toDeliveryNoteDto,
} from './delivery-notes.mapper.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import type { ListDeliveryNotesRequestDto } from './dto/list-delivery-notes.request.dto.js';
import type {
  RawDeliveryNote,
  StoredDeliveryNote,
} from './types/delivery-note.types.js';

@Injectable()
export class DeliveryNotesService {
  constructor(private readonly deliveryNotes: DeliveryNotesRepository) {}

  /** Stores an export's delivery notes, in the order they came. */
  saveAll(
    exportId: string,
    records: RawDeliveryNote[],
  ): Promise<StoredDeliveryNote[]> {
    return this.deliveryNotes.saveAll(exportId, records);
  }

  /** An export's delivery notes, for the pipeline. */
  ofExport(exportId: string): Promise<StoredDeliveryNote[]> {
    return this.deliveryNotes.ofExport(exportId);
  }

  async get(id: string): Promise<DeliveryNoteResponseDto> {
    const note = await this.deliveryNotes.find(id);
    if (!note) {
      throw new DeliveryNoteNotFoundError(id);
    }
    return toDeliveryNoteDto(note);
  }

  async list(
    request: ListDeliveryNotesRequestDto,
  ): Promise<PageResponseDto<DeliveryNoteResponseDto>> {
    const { filters, after, limit } = fromListDeliveryNotesRequestDto(request);
    return toPage(
      await this.deliveryNotes.list(filters, after, limit),
      limit,
      toDeliveryNoteDto,
    );
  }
}
