import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { CreateRunRequestDto } from './dto/create-run.request.dto.js';
import { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import { RunsService } from './runs.service.js';

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  create(@Body() { exportId }: CreateRunRequestDto): Promise<RunResponseDto> {
    return this.runs.start(exportId);
  }

  @Get()
  list(
    @Query() query: ListRunsRequestDto,
  ): Promise<PageResponseDto<RunSummaryResponseDto>> {
    return this.runs.list(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<RunResponseDto> {
    return this.runs.get(id);
  }

  /** A new run over the run's failed shipments, each resuming where it stopped. */
  @Post(':id/retries')
  retry(@Param() { id }: IdRequestDto): Promise<RunResponseDto> {
    return this.runs.retryRun(id);
  }
}
