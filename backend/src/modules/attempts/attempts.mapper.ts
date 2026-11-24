import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import { ShipmentStatus } from '../../generated/prisma/client.js';
import type { ReasonCode } from '../delivery-notes/pipeline/reasons.js';
import type { Reason } from '../delivery-notes/pipeline/types/pipeline.types.js';
import type { AttemptFilters, AttemptRow } from './attempts.repository.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import type { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';

export const fromListAttemptsRequestDto = (
  dto: ListAttemptsRequestDto,
): PageQuery<AttemptFilters> => fromPageRequestDto(dto);

export const toAttemptDto = (row: AttemptRow): AttemptResponseDto => ({
  id: row.id,
  runId: row.runId,
  shipmentId: row.shipmentId ?? undefined,
  deliveryNoteId: row.deliveryNoteId,
  deliveryNoteNumber: row.deliveryNote.number ?? undefined,
  position: row.deliveryNote.position,
  fromStep: row.fromStep,
  reachedStep: row.reachedStep,
  outcome: row.outcome,
  reasonCode: (row.reasonCode as ReasonCode | null) ?? undefined,
  reason: row.reasonMessage ?? undefined,
  issues: (row.issues as Reason[] | null) ?? undefined,
  trackingId: row.trackingId ?? undefined,
  detail: (row.technicalDetail as JsonObject | null) ?? undefined,
  retryable: row.shipment?.status === ShipmentStatus.FAILED,
  createdAt: row.createdAt,
});
