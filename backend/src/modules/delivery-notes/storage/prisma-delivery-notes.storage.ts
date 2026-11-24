import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { DeliveryNotesStorage } from './delivery-notes.storage.js';

export class PrismaDeliveryNotesStorage implements DeliveryNotesStorage {
  constructor(private readonly prisma: PrismaService) {}

  async save(content: Buffer): Promise<string> {
    const id = randomUUID();
    await this.prisma.deliveryNotesExport.create({
      data: { id, content: new Uint8Array(content) },
    });
    return id;
  }

  async read(id: string): Promise<Buffer | undefined> {
    const row = await this.prisma.deliveryNotesExport.findUnique({
      where: { id },
      select: { content: true },
    });
    return row ? Buffer.from(row.content) : undefined;
  }
}
