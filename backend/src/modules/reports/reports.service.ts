import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import { RunNotFoundError } from '../runs/runs.errors.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import type { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';
import type { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import {
  fromListAttemptsRequestDto,
  fromListRunsRequestDto,
  toAttemptDto,
  toRunDto,
  toRunSummaryDto,
} from './reports.mapper.js';
import { ReportsRepository } from './reports.repository.js';

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportsRepository) {}

  async getRun(id: string): Promise<RunResponseDto> {
    const run = await this.reports.findRun(id);
    if (!run) {
      throw new RunNotFoundError(id);
    }
    return toRunDto(run, await this.reports.breakdown(id));
  }

  async listRuns(
    request: ListRunsRequestDto,
  ): Promise<PageResponseDto<RunSummaryResponseDto>> {
    const { filters, after, limit } = fromListRunsRequestDto(request);
    return toPage(
      await this.reports.listRuns(filters, after, limit),
      limit,
      toRunSummaryDto,
    );
  }

  async listAttempts(
    request: ListAttemptsRequestDto,
  ): Promise<PageResponseDto<AttemptResponseDto>> {
    const { filters, after, limit } = fromListAttemptsRequestDto(request);
    return toPage(
      await this.reports.listAttempts(filters, after, limit),
      limit,
      toAttemptDto,
    );
  }
}
