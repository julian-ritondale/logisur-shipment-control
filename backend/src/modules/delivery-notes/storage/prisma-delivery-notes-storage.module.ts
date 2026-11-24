import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DELIVERY_NOTES_STORAGE } from './delivery-notes.storage.js';
import { PrismaDeliveryNotesStorage } from './prisma-delivery-notes.storage.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: DELIVERY_NOTES_STORAGE,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaDeliveryNotesStorage(prisma),
    },
  ],
  exports: [DELIVERY_NOTES_STORAGE],
})
export class PrismaDeliveryNotesStorageModule {}
