import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DeliveryNotesService } from '../delivery-notes/delivery-notes.service.js';
import { ExportNotFoundError, InvalidExportError } from './exports.errors.js';
import { ExportsRepository } from './exports.repository.js';
import { ExportsService } from './exports.service.js';
import { JsonExportsReaderModule } from './reader/json-exports-reader.module.js';
import {
  EXPORTS_STORAGE,
  type ExportsStorage,
} from './storage/exports.storage.js';

class InMemoryStorage implements ExportsStorage {
  readonly files = new Map<string, Buffer>();

  save(content: Buffer): Promise<string> {
    const id = randomUUID();
    this.files.set(id, content);
    return Promise.resolve(id);
  }

  read(id: string): Promise<Buffer | undefined> {
    return Promise.resolve(this.files.get(id));
  }
}

describe('ExportsService', () => {
  let service: ExportsService;
  let storage: InMemoryStorage;
  const repository = { find: vi.fn() };
  const deliveryNotes = { saveAll: vi.fn() };

  beforeEach(async () => {
    storage = new InMemoryStorage();
    vi.resetAllMocks();
    repository.find.mockImplementation((id: string) =>
      Promise.resolve(
        storage.files.has(id)
          ? { id, uploadedAt: new Date(), deliveryNoteCount: 1 }
          : undefined,
      ),
    );
    const module = await Test.createTestingModule({
      imports: [JsonExportsReaderModule],
      providers: [
        ExportsService,
        { provide: EXPORTS_STORAGE, useValue: storage },
        { provide: ExportsRepository, useValue: repository },
        { provide: DeliveryNotesService, useValue: deliveryNotes },
      ],
    }).compile();
    service = module.get(ExportsService);
  });

  describe('Scenario: uploading an export', () => {
    const content = Buffer.from(
      '[{"nro_remito": "R-1", "transportista": "EXPRESO ANDINO "}]',
    );

    it('Given a valid export, when it is uploaded, then the file and every delivery note in it are stored', async () => {
      const summary = await service.upload(content);
      expect(storage.files.get(summary.id)).toEqual(content);
      expect(deliveryNotes.saveAll).toHaveBeenCalledWith(summary.id, [
        { nro_remito: 'R-1', transportista: 'EXPRESO ANDINO ' },
      ]);
    });

    it('Given an uploaded export, when its content is asked for, then it is the same bytes', async () => {
      const { id } = await service.upload(content);
      await expect(service.content(id)).resolves.toEqual(content);
    });

    it('Given content that is not an export, when it is uploaded, then it fails and nothing is stored', async () => {
      await expect(
        service.upload(Buffer.from('{"nro_remito": "R-1"}')),
      ).rejects.toThrow(InvalidExportError);
      expect(storage.files.size).toBe(0);
      expect(deliveryNotes.saveAll).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: an export that does not exist', () => {
    const id = randomUUID();

    it.each([
      ['its summary', () => service.get(id)],
      ['its content', () => service.content(id)],
    ])(
      'Given an unknown export id, when %s is asked for, then it fails as not found',
      async (_case, call) => {
        await expect(call()).rejects.toThrow(ExportNotFoundError);
      },
    );
  });
});
