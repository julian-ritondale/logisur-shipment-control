import { Injectable } from '@nestjs/common';
import { pageArgs } from '../../common/dto/page.response.dto.js';
import type {
  AttemptOutcome,
  PipelineStep,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AttemptFilters {
  runId?: string;
  shipmentId?: string;
  outcome?: AttemptOutcome;
  step?: PipelineStep;
  cause?: string;
  deliveryNoteNumber?: string;
}

const ATTEMPT_DETAILS = {
  deliveryNote: { select: { number: true, position: true } },
  shipment: { select: { status: true } },
} satisfies Prisma.AttemptInclude;

export type AttemptRow = Prisma.AttemptGetPayload<{
  include: typeof ATTEMPT_DETAILS;
}>;

/** Reads attempts. Runs record them, through their own repository. */
@Injectable()
export class AttemptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
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
