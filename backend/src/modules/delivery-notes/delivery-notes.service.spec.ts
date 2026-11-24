import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import {
  ExportNotFoundError,
  InvalidExportError,
} from './delivery-notes.errors.js';
import { DeliveryNotesRepository } from './delivery-notes.repository.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import { JsonDeliveryNotesReaderModule } from './reader/json-delivery-notes-reader.module.js';
import {
  DELIVERY_NOTES_STORAGE,
  type DeliveryNotesStorage,
} from './storage/delivery-notes.storage.js';

class InMemoryStorage implements DeliveryNotesStorage {
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

describe('DeliveryNotesService', () => {
  let service: DeliveryNotesService;
  let storage: InMemoryStorage;
  const repository = {
    saveAll: vi.fn(),
    findExport: vi.fn(),
    deliveryNotesOf: vi.fn(),
  };

  beforeEach(async () => {
    storage = new InMemoryStorage();
    vi.resetAllMocks();
    repository.findExport.mockImplementation((id: string) =>
      Promise.resolve(
        storage.files.has(id)
          ? { id, uploadedAt: new Date(), deliveryNoteCount: 1 }
          : undefined,
      ),
    );
    const module = await Test.createTestingModule({
      imports: [JsonDeliveryNotesReaderModule],
      providers: [
        DeliveryNotesService,
        { provide: DELIVERY_NOTES_STORAGE, useValue: storage },
        { provide: DeliveryNotesRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(DeliveryNotesService);
  });

  describe('Scenario: uploading an export', () => {
    const content = Buffer.from(
      '[{"nro_remito": "R-1", "transportista": "EXPRESO ANDINO "}]',
    );

    it('Given a valid export, when it is uploaded, then the file and every delivery note in it are stored', async () => {
      const summary = await service.upload(content);
      expect(storage.files.get(summary.id)).toEqual(content);
      expect(repository.saveAll).toHaveBeenCalledWith(summary.id, [
        { nro_remito: 'R-1', transportista: 'EXPRESO ANDINO ' },
      ]);
    });

    it('Given an uploaded export, when its content is asked for, then it is the same bytes', async () => {
      const { id } = await service.upload(content);
      await expect(service.exportContent(id)).resolves.toEqual(content);
    });

    it('Given content that is not an export, when it is uploaded, then it fails and nothing is stored', async () => {
      await expect(
        service.upload(Buffer.from('{"nro_remito": "R-1"}')),
      ).rejects.toThrow(InvalidExportError);
      expect(storage.files.size).toBe(0);
      expect(repository.saveAll).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: an export that does not exist', () => {
    const id = randomUUID();

    it.each([
      ['its summary', () => service.getExport(id)],
      ['its content', () => service.exportContent(id)],
      ['its delivery notes', () => service.deliveryNotesOf(id)],
    ])(
      'Given an unknown export id, when %s is asked for, then it fails as not found',
      async (_case, call) => {
        await expect(call()).rejects.toThrow(ExportNotFoundError);
      },
    );
  });
});
