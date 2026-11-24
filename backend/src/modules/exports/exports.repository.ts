import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ExportFilters {
  uploadedFrom?: Date;
  uploadedTo?: Date;
}

export interface ExportSummary {
  id: string;
  uploadedAt: Date;
  deliveryNoteCount: number;
}

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

/** Exports' metadata. Their content is kept by `ExportsStorage`. */
@Injectable()
export class ExportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: string): Promise<ExportSummary | undefined> {
    const row = await this.prisma.deliveryNotesExport.findUnique({
      where: { id },
      select: EXPORT_SUMMARY,
    });
    return row ? toSummary(row) : undefined;
  }

  async list(
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
}
