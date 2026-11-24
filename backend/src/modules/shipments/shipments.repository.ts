import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import { fromIsoDate } from '../../common/types/date.js';
import {
  CarrierStatus,
  ShipmentStatus,
  type PipelineStep,
  type Prisma,
  type Shipment,
} from '../../generated/prisma/client.js';
import type { Cause } from '../../common/types/pipeline.types.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Tracking } from '../carriers/carrier-client.js';

export interface ShipmentFilters {
  status?: ShipmentStatus;
  carrier?: string;
  deliveryNoteNumber?: string;
  failedStep?: PipelineStep;
  cause?: Cause;
  carrierStatus?: CarrierStatus;
  /** Late on `today`: past its estimated delivery and not delivered to the customer. */
  late?: { value: boolean; today: Date };
}

/** A loaded shipment whose tracking can still change. */
export interface TrackedShipment {
  id: string;
  trackingId: string;
}

const late = (today: Date): Prisma.ShipmentWhereInput => ({
  estimatedDelivery: { lt: today },
  carrierStatus: { not: CarrierStatus.DELIVERED },
});

const onTime = (today: Date): Prisma.ShipmentWhereInput => ({
  OR: [
    { estimatedDelivery: null },
    { estimatedDelivery: { gte: today } },
    { carrierStatus: CarrierStatus.DELIVERED },
  ],
});

@Injectable()
export class ShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(id: string): Promise<Shipment | null> {
    return this.prisma.shipment.findUnique({ where: { id } });
  }

  list(
    { deliveryNoteNumber, late: lateFilter, ...filters }: ShipmentFilters,
    after: string | undefined,
    limit: number,
  ): Promise<Shipment[]> {
    return this.prisma.shipment.findMany({
      where: {
        AND: [
          { ...filters, externalRef: deliveryNoteNumber },
          lateFilter
            ? (lateFilter.value ? late : onTime)(lateFilter.today)
            : {},
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(after, limit),
    });
  }

  /** The carrier's loaded shipments it hasn't delivered to the customer yet. */
  async tracked(carrier: string): Promise<TrackedShipment[]> {
    const rows = await this.prisma.shipment.findMany({
      where: {
        carrier,
        status: ShipmentStatus.LOADED,
        trackingId: { not: null },
        OR: [
          { carrierStatus: null },
          { carrierStatus: { not: CarrierStatus.DELIVERED } },
        ],
      },
      select: { id: true, trackingId: true },
      orderBy: { externalRef: 'asc' },
    });
    return rows.flatMap(({ id, trackingId }) =>
      trackingId ? [{ id, trackingId }] : [],
    );
  }

  async saveTracking(
    id: string,
    { status, estimatedDelivery }: Tracking,
    checkedAt: Date,
  ): Promise<void> {
    await this.prisma.shipment.update({
      where: { id },
      data: {
        carrierStatus: status,
        estimatedDelivery: estimatedDelivery
          ? fromIsoDate(estimatedDelivery)
          : null,
        statusCheckedAt: checkedAt,
      },
    });
  }

  /** How many of the carrier's shipments need a look: late, or with a carrier exception. */
  async attention(
    carrier: string,
    today: Date,
  ): Promise<{ late: number; exceptions: number }> {
    const [lateCount, exceptions] = await Promise.all([
      this.prisma.shipment.count({ where: { carrier, ...late(today) } }),
      this.prisma.shipment.count({
        where: { carrier, carrierStatus: CarrierStatus.EXCEPTION },
      }),
    ]);
    return { late: lateCount, exceptions };
  }
}
