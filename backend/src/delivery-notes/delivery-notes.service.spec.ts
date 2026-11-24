import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DeliveryNotesExportNotFoundError,
  InvalidDeliveryNotesExportError,
} from './delivery-notes.errors.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import { JsonDeliveryNotesReaderModule } from './reader/json-delivery-notes-reader.module.js';
import { DELIVERY_NOTES_STORAGE } from './storage/delivery-notes.storage.js';
import { LocalFileDeliveryNotesStorageModule } from './storage/local-file-delivery-notes-storage.module.js';
import { LocalFileDeliveryNotesStorage } from './storage/local-file-delivery-notes.storage.js';

const BOM = '\uFEFF';
const NBSP = '\u00A0';

const remito = (nro_remito: string, transportista: unknown) => ({
  nro_remito,
  transportista,
});

const refs = (notes: Record<string, unknown>[]) =>
  notes.map((n) => n.nro_remito);

describe('DeliveryNotesService', () => {
  let service: DeliveryNotesService;
  let dir: string;

  /** Puts an export straight into local storage and returns its id. */
  const givenExport = async (content: string | Buffer) => {
    const id = randomUUID();
    await writeFile(join(dir, `${id}.json`), content);
    return id;
  };

  const readNotes = async (id: string) =>
    (await service.readExport(id)).deliveryNotes;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'remitos-'));

    // The module's real implementations, with storage in a temporary directory.
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JsonDeliveryNotesReaderModule,
        LocalFileDeliveryNotesStorageModule,
      ],
      providers: [DeliveryNotesService],
    })
      .overrideProvider(DELIVERY_NOTES_STORAGE)
      .useValue(new LocalFileDeliveryNotesStorage(dir))
      .compile();

    service = module.get(DeliveryNotesService);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('Scenario: uploading an export', () => {
    const content = Buffer.from(
      '[{"nro_remito": "R-1", "transportista": "EXPRESO ANDINO "}]',
    );

    it('Given a valid export, when it is uploaded, then its records are returned untouched along with a storage id', async () => {
      await expect(service.upload(content)).resolves.toEqual({
        id: expect.any(String),
        deliveryNotes: [
          { nro_remito: 'R-1', transportista: 'EXPRESO ANDINO ' },
        ],
      });
    });

    it('Given an uploaded export, when it is read back by its id, then the same records are returned', async () => {
      const uploaded = await service.upload(content);
      await expect(service.readExport(uploaded.id)).resolves.toEqual(uploaded);
    });

    it('Given the same export uploaded twice, when both are stored, then each upload gets its own id', async () => {
      const first = await service.upload(content);
      const second = await service.upload(content);
      expect(first.id).not.toBe(second.id);
    });

    it('Given an export that is not valid JSON, when it is uploaded, then it fails with InvalidDeliveryNotesExportError and nothing is stored', async () => {
      await expect(
        service.upload(Buffer.from('[{"nro_remito": "R-1",')),
      ).rejects.toThrow(InvalidDeliveryNotesExportError);
      await expect(readdir(dir)).resolves.toEqual([]);
    });
  });

  describe('Scenario: reading a valid export', () => {
    it('Given an export containing "[]", when it is read, then an empty list is returned', async () => {
      const id = await givenExport('[]');
      await expect(readNotes(id)).resolves.toEqual([]);
    });

    it('Given an export with several remitos, when it is read, then they are returned in file order', async () => {
      const id = await givenExport(
        '[{"nro_remito": "R-3"}, {"nro_remito": "R-1"}, {"nro_remito": "R-2"}]',
      );
      const notes = await readNotes(id);
      expect(refs(notes)).toEqual(['R-3', 'R-1', 'R-2']);
    });

    it('Given the same remito number twice, when it is read, then both copies are kept', async () => {
      const id = await givenExport(
        '[{"nro_remito": "R-1", "bultos": 1}, {"nro_remito": "R-1", "bultos": 2}]',
      );
      await expect(readNotes(id)).resolves.toEqual([
        { nro_remito: 'R-1', bultos: 1 },
        { nro_remito: 'R-1', bultos: 2 },
      ]);
    });

    it('Given dirty values ("145,1" weight, "EXPRESO ANDINO " with a trailing space, blank street), when it is read, then they come back raw', async () => {
      const id = await givenExport(
        '[{"peso_kg": "145,1", "transportista": "EXPRESO ANDINO ", "destinatario": {"direccion": "  "}}]',
      );
      await expect(readNotes(id)).resolves.toEqual([
        {
          peso_kg: '145,1',
          transportista: 'EXPRESO ANDINO ',
          destinatario: { direccion: '  ' },
        },
      ]);
    });

    it('Given records missing fields or with extra fields, when it is read, then they are returned as they are, with no defaults added', async () => {
      const id = await givenExport(
        '[{"nro_remito": "R-1"}, {"nro_remito": "R-2", "campo_nuevo": 1}]',
      );
      await expect(readNotes(id)).resolves.toEqual([
        { nro_remito: 'R-1' },
        { nro_remito: 'R-2', campo_nuevo: 1 },
      ]);
    });

    it('Given explicit null values, when it is read, then they stay null', async () => {
      const id = await givenExport('[{"transportista": null}]');
      await expect(readNotes(id)).resolves.toEqual([{ transportista: null }]);
    });
  });

  describe('Scenario: reading an export with file format quirks', () => {
    it('Given an export that starts with a UTF-8 BOM, when it is read, then the BOM is ignored', async () => {
      const id = await givenExport(`${BOM}[{"nro_remito": "R-1"}]`);
      await expect(readNotes(id)).resolves.toEqual([{ nro_remito: 'R-1' }]);
    });

    it('Given an export with CRLF line endings, when it is read, then the records are returned', async () => {
      const id = await givenExport('[\r\n  {"nro_remito": "R-1"}\r\n]\r\n');
      await expect(readNotes(id)).resolves.toEqual([{ nro_remito: 'R-1' }]);
    });

    it('Given an export with accented Spanish text, when it is read, then the accents are preserved', async () => {
      const id = await givenExport(
        '[{"observaciones": "Cliente no informó CP", "destinatario": {"provincia": "Entre Ríos"}}]',
      );
      await expect(readNotes(id)).resolves.toEqual([
        {
          observaciones: 'Cliente no informó CP',
          destinatario: { provincia: 'Entre Ríos' },
        },
      ]);
    });
  });

  describe('Scenario: reading an export that cannot be read', () => {
    it('Given an id with no stored export, when it is read, then it fails with DeliveryNotesExportNotFoundError', async () => {
      await expect(service.readExport(randomUUID())).rejects.toThrow(
        DeliveryNotesExportNotFoundError,
      );
    });

    it('Given an export saved as Latin-1 instead of UTF-8, when it is read, then it fails with InvalidDeliveryNotesExportError rather than returning garbled accents', async () => {
      const id = await givenExport(
        Buffer.from('[{"destinatario": {"provincia": "Córdoba"}}]', 'latin1'),
      );
      await expect(readNotes(id)).rejects.toThrow(
        InvalidDeliveryNotesExportError,
      );
    });

    it.each([
      ['', 'an empty file'],
      ['   \r\n', 'only whitespace'],
      ['[{"nro_remito": "R-1",', 'truncated JSON'],
      ['[{"nro_remito": "R-1"},]', 'a trailing comma'],
      ['{"nro_remito": "R-1"}', 'an object instead of an array'],
      ['{"remitos": []}', 'an array wrapped in an object'],
      ['null', 'JSON null'],
      ['[{"nro_remito": "R-1"}, null, "R-2"]', 'entries that are not objects'],
    ])(
      'Given an export containing %j (%s), when it is read, then it fails with InvalidDeliveryNotesExportError',
      async (content, _case) => {
        const id = await givenExport(content);
        await expect(readNotes(id)).rejects.toThrow(
          InvalidDeliveryNotesExportError,
        );
      },
    );
  });

  describe('Scenario: filtering by a transportista written in different ways', () => {
    it.each([
      ['EXPRESO ANDINO', 'upper case'],
      ['Expreso Andino', 'title case'],
      ['EXPRESO ANDINO ', 'trailing space'],
      ['Exp. Andino', 'abbreviated "Exp."'],
      ['expreso andino', 'lower case'],
      ['  EXPRESO ANDINO', 'leading spaces'],
      ['\tExpreso Andino\n', 'tab and newline around it'],
      ['EXPRESO   ANDINO', 'several spaces between words'],
      [`EXPRESO${NBSP}ANDINO`, 'non-breaking space between words'],
      ['EXP. ANDINO', 'abbreviation in upper case'],
    ])(
      'Given a remito with transportista %j (%s), when filtering by "Expreso Andino", then it is kept',
      (transportista, _case) => {
        const note = remito('R-1', transportista);
        expect(service.filterByTransportista([note], 'Expreso Andino')).toEqual(
          [note],
        );
      },
    );
  });

  describe('Scenario: filtering leaves out remitos for other or unknown transportistas', () => {
    it.each([
      ['Cruz del Norte', 'another carrier'],
      ['CRUZ DEL NORTE', 'another carrier in upper case'],
      ['TRANSPORTE LITORAL', 'another carrier'],
      ['RETIRA CLIENTE', 'customer pickup'],
      ['', 'empty'],
      ['   ', 'blank'],
      [null, 'null'],
      [undefined, 'absent'],
      [42, 'a number'],
      [['EXPRESO ANDINO'], 'an array'],
      ['Andino', 'only one word'],
      ['Expreso Andino SA', 'a company suffix'],
      ['Transporte Andino', 'a different first word'],
      ['EXPRESOANDINO', 'words glued together'],
    ])(
      'Given a remito with transportista %j (%s), when filtering by "Expreso Andino", then it is left out',
      (transportista, _case) => {
        const notes = [remito('R-1', transportista)];
        expect(service.filterByTransportista(notes, 'Expreso Andino')).toEqual(
          [],
        );
      },
    );
  });

  describe('Scenario: filtering a mix of remitos', () => {
    it('Given no remitos, when filtering, then an empty list is returned', () => {
      expect(service.filterByTransportista([], 'Expreso Andino')).toEqual([]);
    });

    it('Given remitos for several carriers, when filtering by "Expreso Andino", then the matches keep their original order', () => {
      const notes = [
        remito('R-1', 'EXPRESO ANDINO'),
        remito('R-2', 'Cruz del Norte'),
        remito('R-3', 'Exp. Andino'),
        remito('R-4', 'RETIRA CLIENTE'),
        remito('R-5', 'expreso andino'),
      ];
      expect(
        refs(service.filterByTransportista(notes, 'Expreso Andino')),
      ).toEqual(['R-1', 'R-3', 'R-5']);
    });

    it('Given the carrier asked for in another spelling, when filtering by "EXPRESO ANDINO ", then the same remitos match', () => {
      const notes = [
        remito('R-1', 'Expreso Andino'),
        remito('R-2', 'Exp. Andino'),
        remito('R-3', 'Cruz del Norte'),
      ];
      expect(
        refs(service.filterByTransportista(notes, 'EXPRESO ANDINO ')),
      ).toEqual(['R-1', 'R-2']);
    });

    it('Given remitos for Cruz del Norte in two spellings, when filtering by "Cruz del Norte", then only those are kept', () => {
      const notes = [
        remito('R-1', 'EXPRESO ANDINO'),
        remito('R-2', 'Cruz del Norte'),
        remito('R-3', 'CRUZ DEL NORTE'),
      ];
      expect(
        refs(service.filterByTransportista(notes, 'Cruz del Norte')),
      ).toEqual(['R-2', 'R-3']);
    });

    it('Given the same remito twice, when filtering, then both copies are kept (deduplication is not the filter’s job)', () => {
      const notes = [
        remito('R-10000507', 'EXPRESO ANDINO'),
        remito('R-10000507', 'EXPRESO ANDINO'),
      ];
      expect(
        service.filterByTransportista(notes, 'Expreso Andino'),
      ).toHaveLength(2);
    });

    it('Given matching remitos with invalid data (no postal code, 0 packages, "145,1" weight), when filtering, then they are still kept (validation is not the filter’s job)', () => {
      const notes = [
        {
          ...remito('R-1', 'Expreso Andino'),
          destinatario: { codigo_postal: '' },
        },
        { ...remito('R-2', 'Expreso Andino'), bultos: 0 },
        { ...remito('R-3', 'Expreso Andino'), peso_kg: '145,1' },
      ];
      expect(service.filterByTransportista(notes, 'Expreso Andino')).toEqual(
        notes,
      );
    });

    it('Given remitos, when filtering, then neither the input list nor its records are modified, and matches are the same objects', () => {
      const notes = [
        remito('R-1', 'EXPRESO ANDINO '),
        remito('R-2', 'Cruz del Norte'),
      ];
      const snapshot = structuredClone(notes);

      const [match] = service.filterByTransportista(notes, 'Expreso Andino');

      expect(notes).toEqual(snapshot);
      expect(match).toBe(notes[0]);
    });
  });
});
