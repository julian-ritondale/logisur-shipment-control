import { Controller, Get, Query } from '@nestjs/common';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { AttemptsService } from './attempts.service.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';

/** What happened to each delivery note in each run. Read-only: runs record them. */
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Get()
  list(
    @Query() query: ListAttemptsRequestDto,
  ): Promise<PageResponseDto<AttemptResponseDto>> {
    return this.attempts.list(query);
  }
}
