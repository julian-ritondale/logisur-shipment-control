import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type {
  DeliveryNoteFilters,
  ExportFilters,
} from './delivery-notes.repository.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
import type { ListDeliveryNotesRequestDto } from './dto/list-delivery-notes.request.dto.js';
import type { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
import type {
  ExportSummary,
  StoredDeliveryNote,
} from './types/delivery-note.types.js';

export const fromListExportsRequestDto = (
  dto: ListExportsRequestDto,
): PageQuery<ExportFilters> => fromPageRequestDto(dto);

export const fromListDeliveryNotesRequestDto = (
  dto: ListDeliveryNotesRequestDto,
): PageQuery<DeliveryNoteFilters> => fromPageRequestDto(dto);

export const toExportDto = (summary: ExportSummary): ExportResponseDto => ({
  id: summary.id,
  uploadedAt: summary.uploadedAt,
  deliveryNoteCount: summary.deliveryNoteCount,
});

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
