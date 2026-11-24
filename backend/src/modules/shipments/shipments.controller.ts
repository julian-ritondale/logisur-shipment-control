import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import type { RunResponseDto } from '../reports/dto/run.response.dto.js';
import { ListShipmentsRequestDto } from './dto/list-shipments.request.dto.js';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment.response.dto.js';
import { ShipmentsService } from './shipments.service.js';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  list(
    @Query() query: ListShipmentsRequestDto,
  ): Promise<PageResponseDto<ShipmentResponseDto>> {
    return this.shipments.list(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<ShipmentDetailResponseDto> {
    return this.shipments.get(id);
  }

  /** A new run that resumes this failed shipment where it stopped. */
  @Post(':id/retries')
  retry(@Param() { id }: IdRequestDto): Promise<RunResponseDto> {
    return this.shipments.retry(id);
  }
}
