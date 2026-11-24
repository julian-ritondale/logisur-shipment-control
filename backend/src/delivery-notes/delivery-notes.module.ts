import { Module } from '@nestjs/common';
import { DeliveryNotesController } from './delivery-notes.controller.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import { JsonDeliveryNotesReaderModule } from './reader/json-delivery-notes-reader.module.js';
import { LocalFileDeliveryNotesStorageModule } from './storage/local-file-delivery-notes-storage.module.js';

@Module({
  // Pick the implementations here: swap a module to change how exports are
  // read or where they are kept (see ADR 0004).
  imports: [JsonDeliveryNotesReaderModule, LocalFileDeliveryNotesStorageModule],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService],
})
export class DeliveryNotesModule {}
