import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import {
  ShipmentStatus,
  type Shipment,
} from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { ReasonCode } from '../delivery-notes/pipeline/reasons.js';
import type { NormalizedDeliveryNote } from '../delivery-notes/types/delivery-note.types.js';
import type { RunResponseDto } from '../reports/dto/run.response.dto.js';
import { RunsService } from '../runs/runs.service.js';
import type { ListShipmentsRequestDto } from './dto/list-shipments.request.dto.js';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment.response.dto.js';
import {
  ShipmentNotFoundError,
  ShipmentNotRetryableError,
} from './shipments.errors.js';
import { ShipmentsRepository } from './shipments.repository.js';

const toResponse = (row: Shipment): ShipmentResponseDto => ({
  id: row.id,
  carrier: row.carrier,
  carrierName: isCarrier(row.carrier) ? carrierName(row.carrier) : row.carrier,
  deliveryNoteId: row.deliveryNoteId,
  deliveryNoteNumber: row.externalRef,
  status: row.status,
  lastCompletedStep: row.lastCompletedStep ?? undefined,
  failedStep: row.failedStep ?? undefined,
  reasonCode: (row.reasonCode as ReasonCode | null) ?? undefined,
  reason: row.reasonMessage ?? undefined,
  trackingId: row.trackingId ?? undefined,
  deliveredAt: row.deliveredAt ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly shipments: ShipmentsRepository,
    private readonly runs: RunsService,
  ) {}

  async list({
    after,
    limit,
    ...filters
  }: ListShipmentsRequestDto): Promise<PageResponseDto<ShipmentResponseDto>> {
    return toPage(
      await this.shipments.list(filters, after, limit),
      limit,
      toResponse,
    );
  }

  async get(id: string): Promise<ShipmentDetailResponseDto> {
    const row = await this.find(id);
    return Object.assign(toResponse(row), {
      normalized:
        (row.normalized as unknown as NormalizedDeliveryNote | null) ??
        undefined,
      payload: (row.payload as JsonObject | null) ?? undefined,
    });
  }

  async retry(id: string): Promise<RunResponseDto> {
    const row = await this.find(id);
    if (row.status !== ShipmentStatus.FAILED) {
      throw new ShipmentNotRetryableError(id, row.status);
    }
    return this.runs.retryShipment(id);
  }

  private async find(id: string): Promise<Shipment> {
    const row = await this.shipments.find(id);
    if (!row) {
      throw new ShipmentNotFoundError(id);
    }
    return row;
  }
}
