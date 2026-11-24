import type { RunKind, RunStatus } from '../../../generated/prisma/client.js';
import type { ReasonCode } from '../../delivery-notes/pipeline/reasons.js';
import type {
  Outcome,
  Step,
} from '../../delivery-notes/pipeline/types/pipeline.types.js';

export class RunTotalsResponseDto {
  total: number;
  delivered: number;
  failed: number;
  skipped: number;
}

/** How many delivery notes ended each way: the run in business terms. Details: `GET /attempts?runId=`. */
export class RunBreakdownResponseDto {
  outcome: Outcome;
  step: Step;
  reasonCode?: ReasonCode;
  count: number;
}

export class RunSummaryResponseDto {
  id: string;
  kind: RunKind;
  parentRunId?: string;
  exportId: string;
  carrier: string;
  carrierName: string;
  status: RunStatus;
  totals: RunTotalsResponseDto;
  startedAt: Date;
  finishedAt?: Date;
}

export class RunResponseDto extends RunSummaryResponseDto {
  breakdown: RunBreakdownResponseDto[];
}
