import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Empties every table, so each test starts from a clean database. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(PrismaService)
    .$executeRawUnsafe(
      'TRUNCATE attempts, shipments, runs, delivery_notes, delivery_notes_exports CASCADE',
    );
}
