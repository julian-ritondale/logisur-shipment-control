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
import {
  Outcome,
  type Failure,
  type Reason,
  type Step,
} from '../delivery-notes/pipeline/types/pipeline.types.js';
import type { Carrier } from '../carriers/carrier-registry.js';

export type AttemptResult =
  | { outcome: typeof Outcome.DELIVERED; trackingId: string }
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
  reasonCode: string | null;
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
    case Outcome.DELIVERED:
      return { trackingId: result.trackingId };
    case Outcome.SKIPPED:
      return {
        reasonCode: result.reason.code,
        reasonMessage: result.reason.message,
      };
    case Outcome.FAILED: {
      const { step, code, message, issues, detail } = result.failure;
      return {
        failedStep: step,
        reasonCode: code,
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
      by: ['outcome', 'reachedStep', 'reasonCode'],
      where: { runId },
      _count: { _all: true },
      orderBy: [
        { outcome: 'asc' },
        { reachedStep: 'asc' },
        { reasonCode: 'asc' },
      ],
    });
    return groups.map(({ outcome, reachedStep, reasonCode, _count }) => ({
      outcome,
      reachedStep,
      reasonCode,
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
        delivered: count(AttemptOutcome.DELIVERED),
        failed,
        skipped: count(AttemptOutcome.SKIPPED),
        status:
          failed > 0 ? RunStatus.COMPLETED_WITH_FAILURES : RunStatus.COMPLETED,
        finishedAt: new Date(),
      },
    });
  }

  async abort(runId: string): Promise<void> {
    await this.prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.FAILED, finishedAt: new Date() },
    });
  }
}
