import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { DeliveryNotesModule } from '../delivery-notes/delivery-notes.module.js';
import { ExportsController } from './exports.controller.js';
import { ExportsRepository } from './exports.repository.js';
import { ExportsService } from './exports.service.js';
import { JsonExportsReaderModule } from './reader/json-exports-reader.module.js';
import { PrismaExportsStorageModule } from './storage/prisma-exports-storage.module.js';

@Module({
  imports: [
    JsonExportsReaderModule,
    PrismaExportsStorageModule,
    DeliveryNotesModule,
    PrismaModule,
  ],
  controllers: [ExportsController],
  providers: [ExportsService, ExportsRepository],
  exports: [ExportsService],
})
export class ExportsModule {}
