import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import type { JsonObject } from '../../common/types/json.js';
import { valueOf } from '../../common/types/field.js';
import { RunKind } from '../../generated/prisma/client.js';
import type { Carrier } from '../carriers/carrier-registry.js';
import {
  CARRIER_ROUTER,
  type CarrierRouter,
} from '../carriers/carrier-router.js';
import { DeliveryNotesService } from '../delivery-notes/delivery-notes.service.js';
import type { Delivered } from './pipeline/deliverer/deliverer.js';
import {
  deliveryNotesPipeline,
  type DeliveryNotesPipeline,
} from './pipeline/delivery-notes.pipeline.js';
import { contentHash } from './pipeline/filter/content-hash.js';
import type {
  Candidate,
  Decided,
  Decision,
  DeliveredShipment,
} from './pipeline/filter/filters.js';
import { failure, reason } from './pipeline/reasons.js';
import { runStages } from './pipeline/stage.js';
import { type Failure } from './pipeline/types/pipeline.types.js';
import { ExportsService } from '../exports/exports.service.js';
import type { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import {
  RunsShipmentsRepository,
  type RetryableShipment,
} from './runs-shipments.repository.js';
import { NothingToRetryError, RunNotFoundError } from './runs.errors.js';
import {
  fromListRunsRequestDto,
  toRunDto,
  toRunSummaryDto,
} from './runs.mapper.js';
import { RunsRepository, type AttemptResult } from './runs.repository.js';
import { Cause, Outcome, Step } from '../../common/types/pipeline.types.js';

interface Work {
  runId: string;
  shipmentId: string;
  deliveryNoteId: string;
  from: typeof Step.VALIDATE | typeof Step.DELIVER;
  input: unknown;
  attemptFrom: Step;
}

type DecisionOf<O> = Extract<Decision, { outcome: O }>;

const DECISION_RESULTS: {
  [O in Decision['outcome']]: (decision: DecisionOf<O>) => AttemptResult;
} = {
  DELIVERED: ({ trackingId }) => ({ outcome: Outcome.DELIVERED, trackingId }),
  SKIPPED: ({ reason }) => ({ outcome: Outcome.SKIPPED, reason }),
  FAILED: ({ reason }) => ({
    outcome: Outcome.FAILED,
    failure: failure(Step.FILTER, reason),
  }),
};

/** Runs the delivery notes pipeline over an export (or retries failed shipments) and records what happened. */
@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);
  private readonly carrier: Carrier;

  constructor(
    private readonly exports: ExportsService,
    private readonly deliveryNotes: DeliveryNotesService,
    private readonly runs: RunsRepository,
    private readonly shipments: RunsShipmentsRepository,
    @Inject(CARRIER_ROUTER) private readonly router: CarrierRouter,
    config: ConfigService,
  ) {
    this.carrier = config.getOrThrow<Carrier>('CARRIER');
  }

  async start(exportId: string): Promise<RunResponseDto> {
    await this.exports.get(exportId);
    const deliveryNotes = await this.deliveryNotes.ofExport(exportId);
    const runId = await this.runs.create({
      exportId,
      carrier: this.carrier,
      kind: RunKind.INITIAL,
      total: deliveryNotes.length,
    });

    await this.execute(runId, async () => {
      const numbers = deliveryNotes.flatMap((note) => note.number ?? []);
      const pipeline = this.pipeline(
        await this.shipments.deliveredByNumber(this.carrier, numbers),
      );
      const { kept, decided } = pipeline.select(deliveryNotes);
      for (const entry of decided) {
        await this.recordDecision(runId, entry);
      }
      for (const candidate of kept) {
        await this.startShipment(runId, pipeline, candidate);
      }
    });
    return this.get(runId);
  }

  async get(id: string): Promise<RunResponseDto> {
    const run = await this.runs.find(id);
    if (!run) {
      throw new RunNotFoundError(id);
    }
    return toRunDto(run, await this.runs.breakdown(id));
  }

  async list(
    request: ListRunsRequestDto,
  ): Promise<PageResponseDto<RunSummaryResponseDto>> {
    const { filters, after, limit } = fromListRunsRequestDto(request);
    return toPage(
      await this.runs.list(filters, after, limit),
      limit,
      toRunSummaryDto,
    );
  }

  async retryRun(runId: string): Promise<RunResponseDto> {
    const run = await this.runs.find(runId);
    if (!run) {
      throw new RunNotFoundError(runId);
    }
    const shipments = await this.shipments.failedInRun(runId);
    if (shipments.length === 0) {
      throw new NothingToRetryError(runId);
    }
    return this.retry(run.id, run.exportId, shipments);
  }

  async retryShipment(shipmentId: string): Promise<RunResponseDto> {
    const shipment = await this.shipments.findRetryable(shipmentId);
    if (!shipment) {
      throw new NothingToRetryError(shipmentId);
    }
    return this.retry(shipment.lastRunId, shipment.exportId, [shipment]);
  }

  private pipeline(
    delivered?: ReadonlyMap<string, DeliveredShipment>,
  ): DeliveryNotesPipeline {
    return deliveryNotesPipeline({
      carrier: this.carrier,
      client: this.router.clientFor(this.carrier),
      delivered,
    });
  }

  private async retry(
    parentRunId: string | undefined,
    exportId: string,
    shipments: RetryableShipment[],
  ): Promise<RunResponseDto> {
    const runId = await this.runs.create({
      exportId,
      carrier: this.carrier,
      kind: RunKind.RETRY,
      parentRunId,
      total: shipments.length,
    });
    await this.execute(runId, async () => {
      const pipeline = this.pipeline();
      for (const shipment of shipments) {
        const claimed = await this.shipments.claimForRetry(shipment.id);
        if (!claimed) {
          await this.runs.recordAttempt({
            runId,
            deliveryNoteId: shipment.deliveryNoteId,
            shipmentId: shipment.id,
            fromStep: Step.FILTER,
            reachedStep: Step.FILTER,
            result: {
              outcome: Outcome.SKIPPED,
              reason: reason(Cause.IN_PROGRESS_ELSEWHERE),
            },
          });
          continue;
        }
        const resend =
          claimed.failedStep === Step.DELIVER && claimed.payload !== undefined;
        const from = resend ? Step.DELIVER : Step.VALIDATE;
        await this.advance(pipeline, {
          runId,
          shipmentId: claimed.id,
          deliveryNoteId: claimed.deliveryNoteId,
          from,
          input: resend ? claimed.payload : claimed.normalized,
          attemptFrom: from,
        });
      }
    });
    return this.get(runId);
  }

  private async execute(
    runId: string,
    body: () => Promise<void>,
  ): Promise<void> {
    try {
      await body();
      await this.runs.finish(runId);
    } catch (error) {
      this.logger.error(`Run ${runId} aborted`, error as Error);
      await this.runs.abort(runId).catch(() => undefined);
      throw error;
    }
  }

  private recordDecision(
    runId: string,
    { candidate, decision }: Decided,
  ): Promise<void> {
    return this.runs.recordAttempt({
      runId,
      deliveryNoteId: candidate.deliveryNoteId,
      shipmentId:
        decision.outcome === Outcome.DELIVERED
          ? decision.shipmentId
          : undefined,
      fromStep: Step.NORMALIZE,
      reachedStep: Step.FILTER,
      result: DECISION_RESULTS[decision.outcome](decision as never),
    });
  }

  private async startShipment(
    runId: string,
    pipeline: DeliveryNotesPipeline,
    candidate: Candidate,
  ): Promise<void> {
    const { deliveryNoteId, normalized } = candidate;
    const shipmentId = await this.shipments.claim({
      carrier: this.carrier,
      externalRef: valueOf(normalized.number)!,
      deliveryNoteId,
      normalized,
      contentHash: contentHash(normalized),
    });
    if (!shipmentId) {
      await this.runs.recordAttempt({
        runId,
        deliveryNoteId,
        fromStep: Step.NORMALIZE,
        reachedStep: Step.FILTER,
        result: {
          outcome: Outcome.SKIPPED,
          reason: reason(Cause.IN_PROGRESS_ELSEWHERE),
        },
      });
      return;
    }
    await this.advance(pipeline, {
      runId,
      shipmentId,
      deliveryNoteId,
      from: Step.VALIDATE,
      input: normalized,
      attemptFrom: Step.NORMALIZE,
    });
  }

  /** Runs the stages from `work.from`, saving the shipment after each one. */
  private async advance(
    pipeline: DeliveryNotesPipeline,
    work: Work,
  ): Promise<void> {
    try {
      const result = await runStages<Delivered>(
        pipeline.stages,
        work.from,
        work.input,
        (step, output) => this.saveStep(work.shipmentId, step, output),
      );
      if (result.ok) {
        await this.recordAttempt(work, Step.DELIVER, {
          outcome: Outcome.DELIVERED,
          trackingId: result.value.trackingId,
        });
      } else {
        await this.fail(work, result.failure);
      }
    } catch (error) {
      this.logger.error(
        `Shipment ${work.shipmentId} could not be saved`,
        error as Error,
      );
      await this.fail(
        work,
        failure(work.from, reason(Cause.INTERNAL_ERROR), {
          detail: {
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  }

  private async saveStep(
    shipmentId: string,
    step: Step,
    output: unknown,
  ): Promise<void> {
    if (step === Step.DELIVER) {
      await this.shipments.markDelivered(
        shipmentId,
        (output as Delivered).trackingId,
      );
      return;
    }
    await this.shipments.stepCompleted(
      shipmentId,
      step,
      step === Step.MAP ? (output as JsonObject) : undefined,
    );
  }

  private async fail(work: Work, why: Failure): Promise<void> {
    await this.shipments.markFailed(work.shipmentId, why);
    await this.recordAttempt(work, why.step, {
      outcome: Outcome.FAILED,
      failure: why,
    });
  }

  private recordAttempt(
    work: Work,
    reachedStep: Step,
    result: AttemptResult,
  ): Promise<void> {
    return this.runs.recordAttempt({
      runId: work.runId,
      deliveryNoteId: work.deliveryNoteId,
      shipmentId: work.shipmentId,
      fromStep: work.attemptFrom,
      reachedStep,
      result,
    });
  }
}
