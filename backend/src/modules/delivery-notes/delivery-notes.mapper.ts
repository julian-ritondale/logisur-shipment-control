import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { DeliveryNoteFilters } from './delivery-notes.repository.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import type { ListDeliveryNotesRequestDto } from './dto/list-delivery-notes.request.dto.js';
import type { StoredDeliveryNote } from './types/delivery-note.types.js';

export const fromListDeliveryNotesRequestDto = (
  dto: ListDeliveryNotesRequestDto,
): PageQuery<DeliveryNoteFilters> => fromPageRequestDto(dto);

export const toDeliveryNoteDto = (
  note: StoredDeliveryNote,
): DeliveryNoteResponseDto => ({
  id: note.id,
  exportId: note.exportId,
  position: note.position,
  number: note.number,
  carrier: note.carrier,
  raw: note.raw,
});
