import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import type {
  AttemptOutcome,
  PipelineStep,
  Prisma,
  Run,
  RunKind,
  RunStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface RunFilters {
  status?: RunStatus;
  kind?: RunKind;
  exportId?: string;
  carrier?: string;
}

export interface AttemptFilters {
  runId?: string;
  shipmentId?: string;
  outcome?: AttemptOutcome;
  step?: PipelineStep;
  reasonCode?: string;
  deliveryNoteNumber?: string;
}

const ATTEMPT_DETAILS = {
  deliveryNote: { select: { number: true, position: true } },
  shipment: { select: { status: true } },
} satisfies Prisma.AttemptInclude;

export type AttemptRow = Prisma.AttemptGetPayload<{
  include: typeof ATTEMPT_DETAILS;
}>;

export interface BreakdownRow {
  outcome: AttemptOutcome;
  reachedStep: PipelineStep;
  reasonCode: string | null;
  count: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRun(id: string): Promise<Run | null> {
    return this.prisma.run.findUnique({ where: { id } });
  }

  listRuns(
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

  listAttempts(
    { deliveryNoteNumber, step, ...filters }: AttemptFilters,
    after: string | undefined,
    limit: number,
  ): Promise<AttemptRow[]> {
    return this.prisma.attempt.findMany({
      where: {
        ...filters,
        reachedStep: step,
        deliveryNote: deliveryNoteNumber
          ? { number: deliveryNoteNumber }
          : undefined,
      },
      include: ATTEMPT_DETAILS,
      orderBy: [
        { run: { startedAt: 'asc' } },
        { deliveryNote: { position: 'asc' } },
        { id: 'asc' },
      ],
      ...pageArgs(after, limit),
    });
  }
}
