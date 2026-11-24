import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import { ShipmentStatus, type Run } from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { ReasonCode } from '../delivery-notes/pipeline/reasons.js';
import type { Reason } from '../delivery-notes/pipeline/types/pipeline.types.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import type { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';
import type { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunBreakdownResponseDto,
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import type {
  AttemptFilters,
  AttemptRow,
  BreakdownRow,
  RunFilters,
} from './reports.repository.js';

export const fromListRunsRequestDto = (
  dto: ListRunsRequestDto,
): PageQuery<RunFilters> => fromPageRequestDto(dto);

export const fromListAttemptsRequestDto = (
  dto: ListAttemptsRequestDto,
): PageQuery<AttemptFilters> => fromPageRequestDto(dto);

export const toRunSummaryDto = (run: Run): RunSummaryResponseDto => ({
  id: run.id,
  kind: run.kind,
  parentRunId: run.parentRunId ?? undefined,
  exportId: run.exportId,
  carrier: run.carrier,
  carrierName: isCarrier(run.carrier) ? carrierName(run.carrier) : run.carrier,
  status: run.status,
  totals: {
    total: run.total,
    delivered: run.delivered,
    failed: run.failed,
    skipped: run.skipped,
  },
  startedAt: run.startedAt,
  finishedAt: run.finishedAt ?? undefined,
});

export const toRunBreakdownDto = ({
  outcome,
  reachedStep,
  reasonCode,
  count,
}: BreakdownRow): RunBreakdownResponseDto => ({
  outcome,
  step: reachedStep,
  reasonCode: (reasonCode as ReasonCode | null) ?? undefined,
  count,
});

export const toRunDto = (run: Run, breakdown: BreakdownRow[]): RunResponseDto =>
  Object.assign(toRunSummaryDto(run), {
    breakdown: breakdown.map(toRunBreakdownDto),
  });

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
