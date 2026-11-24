import { Module } from '@nestjs/common';
import { ExpresoAndinoModule } from '../../integrations/expreso-andino/expreso-andino.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RunsModule } from '../runs/runs.module.js';
import { ShipmentsController } from './shipments.controller.js';
import { ShipmentsRepository } from './shipments.repository.js';
import { ShipmentsService } from './shipments.service.js';

@Module({
  imports: [RunsModule, ExpresoAndinoModule, PrismaModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
