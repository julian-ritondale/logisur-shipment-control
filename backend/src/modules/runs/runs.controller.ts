import { Body, Controller, Param, Post } from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { RunResponseDto } from '../reports/dto/run.response.dto.js';
import { CreateRunRequestDto } from './dto/create-run.request.dto.js';
import { RunsService } from './runs.service.js';

/** Creating runs. Reading them is the reports module. */
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  create(@Body() { exportId }: CreateRunRequestDto): Promise<RunResponseDto> {
    return this.runs.start(exportId);
  }

  /** A new run over the run's failed shipments, each resuming where it stopped. */
  @Post(':id/retries')
  retry(@Param() { id }: IdRequestDto): Promise<RunResponseDto> {
    return this.runs.retryRun(id);
  }
}
