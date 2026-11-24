import {
  fromPageRequestDto,
  type PageQuery,
} from '../../common/dto/page.request.dto.js';
import type { Run } from '../../generated/prisma/client.js';
import { carrierName, isCarrier } from '../carriers/carrier-registry.js';
import type { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunBreakdownResponseDto,
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import type { BreakdownRow, RunFilters } from './runs.repository.js';
import { type Cause } from '../../common/types/pipeline.types.js';

export const fromListRunsRequestDto = (
  dto: ListRunsRequestDto,
): PageQuery<RunFilters> => fromPageRequestDto(dto);

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
  cause,
  count,
}: BreakdownRow): RunBreakdownResponseDto => ({
  outcome,
  step: reachedStep,
  cause: (cause as Cause | null) ?? undefined,
  count,
});

export const toRunDto = (run: Run, breakdown: BreakdownRow[]): RunResponseDto =>
  Object.assign(toRunSummaryDto(run), {
    breakdown: breakdown.map(toRunBreakdownDto),
  });
