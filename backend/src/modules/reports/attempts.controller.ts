import { Controller, Get, Query } from '@nestjs/common';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(
    @Query() query: ListAttemptsRequestDto,
  ): Promise<PageResponseDto<AttemptResponseDto>> {
    return this.reports.listAttempts(query);
  }
}
