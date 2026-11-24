import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { DeliveryNotesController } from './delivery-notes.controller.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import { DeliveryNotesService } from './delivery-notes.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService, DeliveryNotesRepository],
  exports: [DeliveryNotesService],
})
export class DeliveryNotesModule {}
