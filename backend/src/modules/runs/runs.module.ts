import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CarriersModule } from '../carriers/carriers.module.js';
import { DeliveryNotesModule } from '../delivery-notes/delivery-notes.module.js';
import { ExportsModule } from '../exports/exports.module.js';
import { RunsShipmentsRepository } from './runs-shipments.repository.js';
import { RunsController } from './runs.controller.js';
import { RunsRepository } from './runs.repository.js';
import { RunsService } from './runs.service.js';

@Module({
  imports: [ExportsModule, DeliveryNotesModule, CarriersModule, PrismaModule],
  controllers: [RunsController],
  providers: [RunsService, RunsRepository, RunsShipmentsRepository],
  exports: [RunsService],
})
export class RunsModule {}
