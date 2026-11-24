import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import { startOfUtcDay } from '../../common/types/date.js';
import type { EnvConfig } from '../../config/env.schema.js';
import {
  ShipmentStatus,
  type Shipment,
} from '../../generated/prisma/client.js';
import {
  CARRIER_CLIENT,
  CarrierRequestError,
  type CarrierClient,
} from '../carriers/carrier-client.js';
import type { Carrier } from '../carriers/carrier-registry.js';
import type { RunResponseDto } from '../runs/dto/run.response.dto.js';
import { RunsService } from '../runs/runs.service.js';
import type { ListShipmentsRequestDto } from './dto/list-shipments.request.dto.js';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment.response.dto.js';
import type { StatusCheckResponseDto } from './dto/status-check.response.dto.js';
import {
  ShipmentNotFoundError,
  ShipmentNotRetryableError,
} from './shipments.errors.js';
import {
  fromListShipmentsRequestDto,
  toShipmentDetailDto,
  toShipmentDto,
  toStatusCheckDto,
} from './shipments.mapper.js';
import { ShipmentsRepository } from './shipments.repository.js';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);
  private readonly carrier: Carrier;

  constructor(
    private readonly shipments: ShipmentsRepository,
    private readonly runs: RunsService,
    @Inject(CARRIER_CLIENT) private readonly client: CarrierClient,
    @Inject(ConfigService) config: EnvConfig,
  ) {
    this.carrier = config.get('CARRIER', { infer: true });
  }

  async list(
    request: ListShipmentsRequestDto,
  ): Promise<PageResponseDto<ShipmentResponseDto>> {
    const now = new Date();
    const { filters, after, limit } = fromListShipmentsRequestDto(request, now);
    return toPage(
      await this.shipments.list(filters, after, limit),
      limit,
      (row) => toShipmentDto(row, now),
    );
  }

  async get(id: string): Promise<ShipmentDetailResponseDto> {
    return toShipmentDetailDto(await this.find(id));
  }

  async retry(id: string): Promise<RunResponseDto> {
    const row = await this.find(id);
    if (row.status !== ShipmentStatus.FAILED) {
      throw new ShipmentNotRetryableError(id, row.status);
    }
    return this.runs.retryShipment(id);
  }

  /**
   * Asks the carrier where each loaded shipment it hasn't delivered yet is,
   * and saves its status and estimated delivery. A shipment the carrier can't
   * answer for keeps its last known status and counts as failed.
   */
  async checkStatuses(): Promise<StatusCheckResponseDto> {
    const checkedAt = new Date();
    const tracked = await this.shipments.tracked(this.carrier);
    let failed = 0;
    for (const { id, trackingId } of tracked) {
      try {
        const tracking = await this.client.track(trackingId);
        await this.shipments.saveTracking(id, tracking, checkedAt);
      } catch (error) {
        if (!(error instanceof CarrierRequestError)) {
          throw error;
        }
        failed += 1;
        this.logger.warn(
          `Status of shipment ${id} (${trackingId}) unknown: ${error.message}`,
        );
      }
    }
    return toStatusCheckDto({
      checked: tracked.length,
      failed,
      attention: await this.shipments.attention(
        this.carrier,
        startOfUtcDay(checkedAt),
      ),
      checkedAt,
    });
  }

  private async find(id: string): Promise<Shipment> {
    const row = await this.shipments.find(id);
    if (!row) {
      throw new ShipmentNotFoundError(id);
    }
    return row;
  }
}
