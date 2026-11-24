import { Injectable } from '@nestjs/common';
import {
  toPage,
  type PageResponseDto,
} from '../../common/dto/page.response.dto.js';
import { fromListAttemptsRequestDto, toAttemptDto } from './attempts.mapper.js';
import { AttemptsRepository } from './attempts.repository.js';
import type { AttemptResponseDto } from './dto/attempt.response.dto.js';
import type { ListAttemptsRequestDto } from './dto/list-attempts.request.dto.js';

@Injectable()
export class AttemptsService {
  constructor(private readonly attempts: AttemptsRepository) {}

  async list(
    request: ListAttemptsRequestDto,
  ): Promise<PageResponseDto<AttemptResponseDto>> {
    const { filters, after, limit } = fromListAttemptsRequestDto(request);
    return toPage(
      await this.attempts.list(filters, after, limit),
      limit,
      toAttemptDto,
    );
  }
}
