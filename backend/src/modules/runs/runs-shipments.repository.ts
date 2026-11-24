import { Injectable } from '@nestjs/common';
import {
  AttemptOutcome,
  PipelineStep,
  Prisma,
  ShipmentStatus,
} from '../../generated/prisma/client.js';
import type { JsonObject } from '../../common/types/json.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Carrier } from '../carriers/carrier-registry.js';
import type { DeliveredShipment } from './pipeline/filter/filters.js';
import type { Failure } from './pipeline/types/pipeline.types.js';
import type { NormalizedDeliveryNote } from '../delivery-notes/types/delivery-note.types.js';

const UNIQUE_VIOLATION = 'P2002';

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_VIOLATION;

const json = (value: object) => value as Prisma.InputJsonObject;

/** A failed shipment, with what a retry needs to resume it. */
export interface RetryableShipment {
  id: string;
  deliveryNoteId: string;
  exportId: string;
  failedStep?: PipelineStep;
  normalized: NormalizedDeliveryNote;
  payload?: JsonObject;
  lastRunId?: string;
}

export interface Claim {
  carrier: Carrier;
  externalRef: string;
  deliveryNoteId: string;
  normalized: NormalizedDeliveryNote;
  contentHash: string;
}

const RETRY_DETAILS = {
  deliveryNote: { select: { exportId: true } },
  attempts: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { runId: true },
  },
} satisfies Prisma.ShipmentInclude;

const toRetryable = (
  row: Prisma.ShipmentGetPayload<{ include: typeof RETRY_DETAILS }>,
): RetryableShipment => ({
  id: row.id,
  deliveryNoteId: row.deliveryNoteId,
  exportId: row.deliveryNote.exportId,
  failedStep: row.failedStep ?? undefined,
  normalized: row.normalized as unknown as NormalizedDeliveryNote,
  payload: (row.payload as JsonObject | null) ?? undefined,
  lastRunId: row.attempts[0]?.runId,
});

/** How a run moves shipments along: claiming them, and saving each step's output. */
@Injectable()
export class RunsShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deliveredByNumber(
    carrier: Carrier,
    numbers: string[],
  ): Promise<Map<string, DeliveredShipment>> {
    const rows = await this.prisma.shipment.findMany({
      where: {
        carrier,
        status: ShipmentStatus.DELIVERED,
        externalRef: { in: numbers },
      },
      select: {
        id: true,
        externalRef: true,
        trackingId: true,
        contentHash: true,
      },
    });
    return new Map(
      rows.map((row) => [
        row.externalRef,
        {
          shipmentId: row.id,
          trackingId: row.trackingId ?? '',
          contentHash: row.contentHash ?? '',
        },
      ]),
    );
  }

  /** Takes the shipment for (carrier, number), starting over from this delivery note. `undefined` if another run holds it. */
  async claim({
    carrier,
    externalRef,
    deliveryNoteId,
    normalized,
    contentHash,
  }: Claim): Promise<string | undefined> {
    const data = {
      status: ShipmentStatus.PROCESSING,
      deliveryNoteId,
      normalized: json(normalized),
      contentHash,
      lastCompletedStep: PipelineStep.FILTER,
      failedStep: null,
      cause: null,
      reasonMessage: null,
      payload: Prisma.DbNull,
      trackingId: null,
    };
    const { count } = await this.prisma.shipment.updateMany({
      where: {
        carrier,
        externalRef,
        status: { in: [ShipmentStatus.PENDING, ShipmentStatus.FAILED] },
      },
      data,
    });
    if (count === 1) {
      const { id } = await this.prisma.shipment.findUniqueOrThrow({
        where: { carrier_externalRef: { carrier, externalRef } },
        select: { id: true },
      });
      return id;
    }
    try {
      const { id } = await this.prisma.shipment.create({
        data: { carrier, externalRef, ...data },
        select: { id: true },
      });
      return id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /** Takes a failed shipment to retry it; `undefined` if it's no longer failed. */
  async claimForRetry(id: string): Promise<RetryableShipment | undefined> {
    const { count } = await this.prisma.shipment.updateMany({
      where: { id, status: ShipmentStatus.FAILED },
      data: { status: ShipmentStatus.PROCESSING },
    });
    if (count === 0) {
      return undefined;
    }
    return toRetryable(
      await this.prisma.shipment.findUniqueOrThrow({
        where: { id },
        include: RETRY_DETAILS,
      }),
    );
  }

  async findRetryable(id: string): Promise<RetryableShipment | undefined> {
    const row = await this.prisma.shipment.findFirst({
      where: { id, status: ShipmentStatus.FAILED },
      include: RETRY_DETAILS,
    });
    return row ? toRetryable(row) : undefined;
  }

  async failedInRun(runId: string): Promise<RetryableShipment[]> {
    const rows = await this.prisma.shipment.findMany({
      where: {
        status: ShipmentStatus.FAILED,
        attempts: { some: { runId, outcome: AttemptOutcome.FAILED } },
      },
      include: RETRY_DETAILS,
      orderBy: { externalRef: 'asc' },
    });
    return rows.map(toRetryable);
  }

  async stepCompleted(
    id: string,
    step: PipelineStep,
    payload?: JsonObject,
  ): Promise<void> {
    await this.prisma.shipment.update({
      where: { id },
      data: {
        lastCompletedStep: step,
        ...(payload && { payload: json(payload) }),
      },
    });
  }

  async markDelivered(id: string, trackingId: string): Promise<void> {
    await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.DELIVERED,
        lastCompletedStep: PipelineStep.DELIVER,
        trackingId,
        deliveredAt: new Date(),
        failedStep: null,
        cause: null,
        reasonMessage: null,
      },
    });
  }

  async markFailed(
    id: string,
    { step, cause, message }: Failure,
  ): Promise<void> {
    await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.FAILED,
        failedStep: step,
        cause,
        reasonMessage: message,
      },
    });
  }
}
