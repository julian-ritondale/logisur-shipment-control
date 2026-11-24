import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import type {
  PipelineStep,
  Shipment,
  ShipmentStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ShipmentFilters {
  status?: ShipmentStatus;
  carrier?: string;
  deliveryNoteNumber?: string;
  failedStep?: PipelineStep;
  reasonCode?: string;
}

@Injectable()
export class ShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(id: string): Promise<Shipment | null> {
    return this.prisma.shipment.findUnique({ where: { id } });
  }

  list(
    { deliveryNoteNumber, ...filters }: ShipmentFilters,
    after: string | undefined,
    limit: number,
  ): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: { ...filters, externalRef: deliveryNoteNumber },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(after, limit),
    });
  }
}
