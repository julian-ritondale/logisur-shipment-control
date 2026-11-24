import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
import type { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
import type { ExportFilters, ExportSummary } from './exports.repository.js';

export const fromListExportsRequestDto = (
  dto: ListExportsRequestDto,
): PageQuery<ExportFilters> => fromPageRequestDto(dto);

export const toExportDto = (summary: ExportSummary): ExportResponseDto => ({
  id: summary.id,
  uploadedAt: summary.uploadedAt,
  deliveryNoteCount: summary.deliveryNoteCount,
});
