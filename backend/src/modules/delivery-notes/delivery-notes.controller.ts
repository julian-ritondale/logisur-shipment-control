import { Controller, Get, Param, Query } from '@nestjs/common';
import { ID_SCHEMA } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import type { DeliveryNoteResponseDto } from './dto/delivery-note.response.dto.js';
import {
  LIST_DELIVERY_NOTES_REQUEST_SCHEMA,
  type ListDeliveryNotesRequestDto,
} from './dto/list-delivery-notes.request.dto.js';

@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(private readonly deliveryNotes: DeliveryNotesService) {}

  @Get()
  list(
    @Query({ schema: LIST_DELIVERY_NOTES_REQUEST_SCHEMA })
    query: ListDeliveryNotesRequestDto,
  ): Promise<PageResponseDto<DeliveryNoteResponseDto>> {
    return this.deliveryNotes.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id', { schema: ID_SCHEMA }) id: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotes.get(id);
  }
}
