import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import { ShipmentStatus, type Run } from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { ReasonCode } from '../delivery-notes/pipeline/reasons.js';
import type { Reason } from '../delivery-notes/pipeline/types/pipeline.types.js';
import { RunNotFoundError } from '../runs/runs.errors.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import type { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';
import type { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import { ReportsRepository, type AttemptRow } from './reports.repository.js';

const toSummary = (run: Run): RunSummaryResponseDto => ({
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

const toAttempt = (row: AttemptRow): AttemptResponseDto => ({
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

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportsRepository) {}

  async getRun(id: string): Promise<RunResponseDto> {
    const run = await this.reports.findRun(id);
    if (!run) {
      throw new RunNotFoundError(id);
    }
    const breakdown = await this.reports.breakdown(id);
    return Object.assign(toSummary(run), {
      breakdown: breakdown.map(
        ({ outcome, reachedStep, reasonCode, count }) => ({
          outcome,
          step: reachedStep,
          reasonCode: (reasonCode as ReasonCode | null) ?? undefined,
          count,
        }),
      ),
    });
  }

  async listRuns({
    after,
    limit,
    ...filters
  }: ListRunsRequestDto): Promise<PageResponseDto<RunSummaryResponseDto>> {
    return toPage(
      await this.reports.listRuns(filters, after, limit),
      limit,
      toSummary,
    );
  }

  async listAttempts({
    after,
    limit,
    ...filters
  }: ListAttemptsRequestDto): Promise<PageResponseDto<AttemptResponseDto>> {
    return toPage(
      await this.reports.listAttempts(filters, after, limit),
      limit,
      toAttempt,
    );
  }
}
