import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CarriersModule } from '../carriers/carriers.module.js';
import { DeliveryNotesModule } from '../delivery-notes/delivery-notes.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { RunShipmentsRepository } from './run-shipments.repository.js';
import { RunsController } from './runs.controller.js';
import { RunsRepository } from './runs.repository.js';
import { RunsService } from './runs.service.js';

@Module({
  imports: [DeliveryNotesModule, ReportsModule, CarriersModule, PrismaModule],
  controllers: [RunsController],
  providers: [RunsService, RunsRepository, RunShipmentsRepository],
  exports: [RunsService],
})
export class RunsModule {}
