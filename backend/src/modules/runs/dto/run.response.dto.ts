import type { RunKind, RunStatus } from '../../../generated/prisma/client.js';
import {
  type Cause,
  type Outcome,
  type Step,
} from '../../../common/types/pipeline.types.js';

export class RunTotalsResponseDto {
  total: number;
  loaded: number;
  failed: number;
  skipped: number;
}

/** How many delivery notes ended each way: the run in business terms. Details: `GET /attempts?runId=`. */
export class RunBreakdownResponseDto {
  outcome: Outcome;
  step: Step;
  cause?: Cause;
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
