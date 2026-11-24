import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import type { Shipment } from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { NormalizedDeliveryNote } from '../delivery-notes/types/delivery-note.types.js';
import type { ListShipmentsRequestDto } from './dto/list-shipments.request.dto.js';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment.response.dto.js';
import type { ShipmentFilters } from './shipments.repository.js';
import { type Cause } from '../../common/types/pipeline.types.js';

export const fromListShipmentsRequestDto = (
  dto: ListShipmentsRequestDto,
): PageQuery<ShipmentFilters> => fromPageRequestDto(dto);

export const toShipmentDto = (row: Shipment): ShipmentResponseDto => ({
  id: row.id,
  carrier: row.carrier,
  carrierName: isCarrier(row.carrier) ? carrierName(row.carrier) : row.carrier,
  deliveryNoteId: row.deliveryNoteId,
  deliveryNoteNumber: row.externalRef,
  status: row.status,
  lastCompletedStep: row.lastCompletedStep ?? undefined,
  failedStep: row.failedStep ?? undefined,
  cause: (row.cause as Cause | null) ?? undefined,
  reason: row.reasonMessage ?? undefined,
  trackingId: row.trackingId ?? undefined,
  deliveredAt: row.deliveredAt ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toShipmentDetailDto = (row: Shipment): ShipmentDetailResponseDto =>
  Object.assign(toShipmentDto(row), {
    normalized:
      (row.normalized as unknown as NormalizedDeliveryNote | null) ?? undefined,
    payload: (row.payload as JsonObject | null) ?? undefined,
  });
