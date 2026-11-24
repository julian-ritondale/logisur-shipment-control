import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { DeliveryNotesController } from './delivery-notes.controller.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import { ExportsController } from './exports.controller.js';
import { JsonDeliveryNotesReaderModule } from './reader/json-delivery-notes-reader.module.js';
import { PrismaDeliveryNotesStorageModule } from './storage/prisma-delivery-notes-storage.module.js';

@Module({
  imports: [
    JsonDeliveryNotesReaderModule,
    PrismaDeliveryNotesStorageModule,
    PrismaModule,
  ],
  controllers: [ExportsController, DeliveryNotesController],
  providers: [DeliveryNotesService, DeliveryNotesRepository],
  exports: [DeliveryNotesService],
})
export class DeliveryNotesModule {}
