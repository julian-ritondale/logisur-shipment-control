import { Controller, Get, Param, Query } from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import { ListDeliveryNotesRequestDto } from './dto/list-delivery-notes.request.dto.js';

@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(private readonly deliveryNotes: DeliveryNotesService) {}

  @Get()
  list(
    @Query() query: ListDeliveryNotesRequestDto,
  ): Promise<PageResponseDto<DeliveryNoteResponseDto>> {
    return this.deliveryNotes.list(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotes.get(id);
  }
}
