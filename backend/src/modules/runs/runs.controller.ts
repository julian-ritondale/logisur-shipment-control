import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ID_SCHEMA } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import {
  CREATE_RUN_REQUEST_SCHEMA,
  type CreateRunRequestDto,
} from './dto/create-run.request.dto.js';
import {
  LIST_RUNS_REQUEST_SCHEMA,
  type ListRunsRequestDto,
} from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import { RunsService } from './runs.service.js';

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  create(
    @Body({ schema: CREATE_RUN_REQUEST_SCHEMA })
    { exportId }: CreateRunRequestDto,
  ): Promise<RunResponseDto> {
    return this.runs.start(exportId);
  }

  @Get()
  list(
    @Query({ schema: LIST_RUNS_REQUEST_SCHEMA }) query: ListRunsRequestDto,
  ): Promise<PageResponseDto<RunSummaryResponseDto>> {
    return this.runs.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id', { schema: ID_SCHEMA }) id: string,
  ): Promise<RunResponseDto> {
    return this.runs.get(id);
  }

  /** A new run over the run's failed shipments, each resuming where it stopped. */
  @Post(':id/retries')
  retry(
    @Param('id', { schema: ID_SCHEMA }) id: string,
  ): Promise<RunResponseDto> {
    return this.runs.retryRun(id);
  }
}
