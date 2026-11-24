import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import { startOfUtcDay, toIsoDate } from '../../common/types/date.js';
import { CarrierStatus, type Shipment } from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { ListShipmentsRequestDto } from './dto/list-shipments.request.dto.js';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment.response.dto.js';
import type { StatusCheckResponseDto } from './dto/status-check.response.dto.js';
import type { ShipmentFilters } from './shipments.repository.js';

/** `late` is judged against `now`'s day. */
export const fromListShipmentsRequestDto = (
  { late, ...dto }: ListShipmentsRequestDto,
  now: Date,
): PageQuery<ShipmentFilters> => {
  const { filters, after, limit } = fromPageRequestDto(dto);
  return {
    filters: {
      ...filters,
      late:
        late === undefined
          ? undefined
          : { value: late, today: startOfUtcDay(now) },
    },
    after,
    limit,
  };
};

/** Past its estimated delivery day, and the carrier hasn't delivered it to the customer. */
export const isLate = (
  { estimatedDelivery, carrierStatus }: Shipment,
  now: Date,
): boolean =>
  estimatedDelivery !== null &&
  carrierStatus !== CarrierStatus.DELIVERED &&
  estimatedDelivery < startOfUtcDay(now);

export const toShipmentDto = (
  row: Shipment,
  now: Date = new Date(),
): ShipmentResponseDto => ({
  id: row.id,
  carrier: row.carrier,
  carrierName: isCarrier(row.carrier) ? carrierName(row.carrier) : row.carrier,
  deliveryNoteId: row.deliveryNoteId,
  deliveryNoteNumber: row.externalRef,
  status: row.status,
  lastCompletedStep: row.lastCompletedStep ?? undefined,
  failedStep: row.failedStep ?? undefined,
  cause: row.cause ?? undefined,
  reason: row.reasonMessage ?? undefined,
  trackingId: row.trackingId ?? undefined,
  loadedAt: row.loadedAt ?? undefined,
  carrierStatus: row.carrierStatus ?? undefined,
  estimatedDelivery: row.estimatedDelivery
    ? toIsoDate(row.estimatedDelivery)
    : undefined,
  statusCheckedAt: row.statusCheckedAt ?? undefined,
  late: isLate(row, now),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toShipmentDetailDto = (row: Shipment): ShipmentDetailResponseDto =>
  Object.assign(toShipmentDto(row), {
    normalized: row.normalized ?? undefined,
    payload: row.payload ?? undefined,
  });

/** What a status check found, before it becomes a response. */
export interface StatusCheck {
  checked: number;
  failed: number;
  attention: { late: number; exceptions: number };
  checkedAt: Date;
}

export const toStatusCheckDto = ({
  checked,
  failed,
  attention,
  checkedAt,
}: StatusCheck): StatusCheckResponseDto => ({
  checked,
  failed,
  late: attention.late,
  exceptions: attention.exceptions,
  checkedAt,
});
