import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import { valueOf } from '../../common/types/field.js';
import type { DeliveryNote, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { isCarrier, resolveCarrier } from '../carriers/carrier-registry.js';
import { TEXT_SCHEMA } from './schemas/delivery-note.schemas.js';
import type {
  ExportSummary,
  RawDeliveryNote,
  StoredDeliveryNote,
} from './types/delivery-note.types.js';

export interface ExportFilters {
  uploadedFrom?: Date;
  uploadedTo?: Date;
}

export interface DeliveryNoteFilters {
  exportId?: string;
  number?: string;
  carrier?: string;
}

const toStored = (row: DeliveryNote): StoredDeliveryNote => ({
  id: row.id,
  exportId: row.exportId,
  position: row.position,
  number: row.number ?? undefined,
  carrier: row.carrier && isCarrier(row.carrier) ? row.carrier : undefined,
  raw: row.raw as RawDeliveryNote,
});

const EXPORT_SUMMARY = {
  id: true,
  uploadedAt: true,
  _count: { select: { deliveryNotes: true } },
} satisfies Prisma.DeliveryNotesExportSelect;

const toSummary = (
  row: Prisma.DeliveryNotesExportGetPayload<{ select: typeof EXPORT_SUMMARY }>,
): ExportSummary => ({
  id: row.id,
  uploadedAt: row.uploadedAt,
  deliveryNoteCount: row._count.deliveryNotes,
});

@Injectable()
export class DeliveryNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveAll(
    exportId: string,
    records: RawDeliveryNote[],
  ): Promise<StoredDeliveryNote[]> {
    const rows = await this.prisma.deliveryNote.createManyAndReturn({
      data: records.map((raw, position) => ({
        exportId,
        position,
        number: TEXT_SCHEMA.safeParse(raw.nro_remito).data || undefined,
        carrier: valueOf(resolveCarrier(raw.transportista)),
        raw: raw as Prisma.InputJsonObject,
      })),
    });
    return rows.map(toStored).sort((a, b) => a.position - b.position);
  }

  async findExport(id: string): Promise<ExportSummary | undefined> {
    const row = await this.prisma.deliveryNotesExport.findUnique({
      where: { id },
      select: EXPORT_SUMMARY,
    });
    return row ? toSummary(row) : undefined;
  }

  async listExports(
    filters: ExportFilters,
    after: string | undefined,
    limit: number,
  ): Promise<ExportSummary[]> {
    const rows = await this.prisma.deliveryNotesExport.findMany({
      where: {
        uploadedAt: { gte: filters.uploadedFrom, lte: filters.uploadedTo },
      },
      select: EXPORT_SUMMARY,
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(after, limit),
    });
    return rows.map(toSummary);
  }

  async findDeliveryNote(id: string): Promise<StoredDeliveryNote | undefined> {
    const row = await this.prisma.deliveryNote.findUnique({ where: { id } });
    return row ? toStored(row) : undefined;
  }

  async listDeliveryNotes(
    filters: DeliveryNoteFilters,
    after: string | undefined,
    limit: number,
  ): Promise<StoredDeliveryNote[]> {
    const rows = await this.prisma.deliveryNote.findMany({
      where: filters,
      orderBy: [{ exportId: 'asc' }, { position: 'asc' }, { id: 'asc' }],
      ...pageArgs(after, limit),
    });
    return rows.map(toStored);
  }

  async deliveryNotesOf(exportId: string): Promise<StoredDeliveryNote[]> {
    const rows = await this.prisma.deliveryNote.findMany({
      where: { exportId },
      orderBy: { position: 'asc' },
    });
    return rows.map(toStored);
  }
}
