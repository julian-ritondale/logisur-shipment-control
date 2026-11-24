import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EXPORTS_STORAGE } from './exports.storage.js';
import { PrismaExportsStorage } from './prisma-exports.storage.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: EXPORTS_STORAGE,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaExportsStorage(prisma),
    },
  ],
  exports: [EXPORTS_STORAGE],
})
export class PrismaExportsStorageModule {}
