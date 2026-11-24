import { Controller, Get, Param, Query } from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { ListRunsRequestDto } from './dto/list-runs.request.dto.js';
import type {
  RunResponseDto,
  RunSummaryResponseDto,
} from './dto/run.response.dto.js';
import { ReportsService } from './reports.service.js';

/** Reading runs. Creating them is the runs module. */
@Controller('runs')
export class RunsReportController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(
    @Query() query: ListRunsRequestDto,
  ): Promise<PageResponseDto<RunSummaryResponseDto>> {
    return this.reports.listRuns(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<RunResponseDto> {
    return this.reports.getRun(id);
  }
}
