import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import {
  ShipmentStatus,
  type Shipment,
} from '../../generated/prisma/client.js';
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
import {
  fromListShipmentsRequestDto,
  toShipmentDetailDto,
  toShipmentDto,
} from './shipments.mapper.js';
import { ShipmentsRepository } from './shipments.repository.js';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly shipments: ShipmentsRepository,
    private readonly runs: RunsService,
  ) {}

  async list(
    request: ListShipmentsRequestDto,
  ): Promise<PageResponseDto<ShipmentResponseDto>> {
    const { filters, after, limit } = fromListShipmentsRequestDto(request);
    return toPage(
      await this.shipments.list(filters, after, limit),
      limit,
      toShipmentDto,
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

  private async find(id: string): Promise<Shipment> {
    const row = await this.shipments.find(id);
    if (!row) {
      throw new ShipmentNotFoundError(id);
    }
    return row;
  }
}
