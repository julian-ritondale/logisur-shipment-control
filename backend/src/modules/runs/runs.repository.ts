import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import {
  AttemptOutcome,
  PipelineStep,
  Prisma,
  Run,
  RunKind,
  RunStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { type Failure } from './pipeline/types/pipeline.types.js';
import type { Carrier } from '../carriers/carrier-registry.js';
import {
  Outcome,
  type Reason,
  type Step,
} from '../../common/types/pipeline.types.js';

export type AttemptResult =
  | { outcome: typeof Outcome.LOADED; trackingId: string }
  | { outcome: typeof Outcome.SKIPPED; reason: Reason }
  | { outcome: typeof Outcome.FAILED; failure: Failure };

export interface AttemptRecord {
  runId: string;
  deliveryNoteId: string;
  shipmentId?: string;
  fromStep: Step;
  reachedStep: Step;
  result: AttemptResult;
}

export interface RunFilters {
  status?: RunStatus;
  kind?: RunKind;
  exportId?: string;
  carrier?: string;
}

/** How many of a run's attempts ended each way. */
export interface BreakdownRow {
  outcome: AttemptOutcome;
  reachedStep: PipelineStep;
  cause: string | null;
  count: number;
}

export interface NewRun {
  exportId: string;
  carrier: Carrier;
  kind: RunKind;
  parentRunId?: string;
  total: number;
}

const json = (value: object) => value as Prisma.InputJsonObject;

const attemptColumns = (result: AttemptResult) => {
  switch (result.outcome) {
    case Outcome.LOADED:
      return { trackingId: result.trackingId };
    case Outcome.SKIPPED:
      return {
        cause: result.reason.cause,
        reasonMessage: result.reason.message,
      };
    case Outcome.FAILED: {
      const { step, cause, message, issues, detail } = result.failure;
      return {
        failedStep: step,
        cause,
        reasonMessage: message,
        ...(issues && { issues: issues.map(json) }),
        ...(detail && { technicalDetail: json(detail) }),
      };
    }
  }
};

@Injectable()
export class RunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(run: NewRun): Promise<string> {
    const { id } = await this.prisma.run.create({
      data: run,
      select: { id: true },
    });
    return id;
  }

  find(id: string): Promise<Run | null> {
    return this.prisma.run.findUnique({ where: { id } });
  }

  list(
    filters: RunFilters,
    after: string | undefined,
    limit: number,
  ): Promise<Run[]> {
    return this.prisma.run.findMany({
      where: filters,
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      ...pageArgs(after, limit),
    });
  }

  async breakdown(runId: string): Promise<BreakdownRow[]> {
    const groups = await this.prisma.attempt.groupBy({
      by: ['outcome', 'reachedStep', 'cause'],
      where: { runId },
      _count: { _all: true },
      orderBy: [{ outcome: 'asc' }, { reachedStep: 'asc' }, { cause: 'asc' }],
    });
    return groups.map(({ outcome, reachedStep, cause, _count }) => ({
      outcome,
      reachedStep,
      cause,
      count: _count._all,
    }));
  }

  async recordAttempt({ result, ...attempt }: AttemptRecord): Promise<void> {
    await this.prisma.attempt.create({
      data: { ...attempt, outcome: result.outcome, ...attemptColumns(result) },
    });
  }

  /** Closes a run with its counts, taken from its attempts. */
  async finish(runId: string): Promise<void> {
    const groups = await this.prisma.attempt.groupBy({
      by: ['outcome'],
      where: { runId },
      _count: { _all: true },
    });
    const count = (outcome: AttemptOutcome) =>
      groups.find((group) => group.outcome === outcome)?._count._all ?? 0;
    const failed = count(AttemptOutcome.FAILED);
    await this.prisma.run.update({
      where: { id: runId },
      data: {
        loaded: count(AttemptOutcome.LOADED),
        failed,
        skipped: count(AttemptOutcome.SKIPPED),
        status:
          failed > 0 ? RunStatus.COMPLETED_WITH_FAILURES : RunStatus.COMPLETED,
        finishedAt: new Date(),
      },
    });
  }

  /** Closes every run still `RUNNING` as `FAILED`. Returns how many there were. */
  async abortRunning(): Promise<number> {
    const { count } = await this.prisma.run.updateMany({
      where: { status: RunStatus.RUNNING },
      data: { status: RunStatus.FAILED, finishedAt: new Date() },
    });
    return count;
  }

  async abort(runId: string): Promise<void> {
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.FAILED, finishedAt: new Date() },
    });
  }
}
