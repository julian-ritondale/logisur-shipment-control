import { InvalidExportError } from '../exports.errors.js';
import { JsonExportsReader } from './json-exports.reader.js';

const BOM = '\uFEFF';
const reader = new JsonExportsReader();
const read = (content: string | Buffer) => reader.read(Buffer.from(content));

describe('JsonExportsReader', () => {
  describe('Scenario: reading a valid export', () => {
    it('Given "[]", when it is read, then there are no delivery notes', () => {
      expect(read('[]')).toEqual([]);
    });

    it('Given several delivery notes, when it is read, then they come back in file order', () => {
      expect(read('[{"nro_remito": "R-3"}, {"nro_remito": "R-1"}]')).toEqual([
        { nro_remito: 'R-3' },
        { nro_remito: 'R-1' },
      ]);
    });

    it('Given the same number twice, when it is read, then both copies are kept', () => {
      expect(
        read(
          '[{"nro_remito": "R-1", "bultos": 1}, {"nro_remito": "R-1", "bultos": 2}]',
        ),
      ).toHaveLength(2);
    });

    it('Given dirty values, when it is read, then they come back raw (cleaning is NORMALIZE)', () => {
      expect(
        read(
          '[{"peso_kg": "145,1", "transportista": "EXPRESO ANDINO ", "destinatario": {"direccion": "  "}}]',
        ),
      ).toEqual([
        {
          peso_kg: '145,1',
          transportista: 'EXPRESO ANDINO ',
          destinatario: { direccion: '  ' },
        },
      ]);
    });

    it('Given missing fields, extra fields and explicit nulls, when it is read, then nothing is added or removed', () => {
      expect(
        read(
          '[{"nro_remito": "R-1", "campo_nuevo": 1, "transportista": null}]',
        ),
      ).toEqual([{ nro_remito: 'R-1', campo_nuevo: 1, transportista: null }]);
    });
  });

  describe('Scenario: file format quirks', () => {
    it('Given a UTF-8 BOM, when it is read, then the BOM is ignored', () => {
      expect(read(`${BOM}[{"nro_remito": "R-1"}]`)).toEqual([
        { nro_remito: 'R-1' },
      ]);
    });

    it('Given CRLF line endings, when it is read, then the delivery notes are returned', () => {
      expect(read('[\r\n  {"nro_remito": "R-1"}\r\n]\r\n')).toEqual([
        { nro_remito: 'R-1' },
      ]);
    });

    it('Given accented Spanish text, when it is read, then the accents are preserved', () => {
      expect(
        read(
          '[{"observaciones": "Cliente no informó CP", "provincia": "Entre Ríos"}]',
        ),
      ).toEqual([
        { observaciones: 'Cliente no informó CP', provincia: 'Entre Ríos' },
      ]);
    });
  });

  describe('Scenario: content that is not an export is rejected as a whole', () => {
    it.each([
      ['', 'The export is empty'],
      ['   \r\n', 'The export is empty'],
      ['[{"nro_remito": "R-1",', 'The export is not valid JSON'],
      ['[{"nro_remito": "R-1"},]', 'The export is not valid JSON'],
      [
        '{"nro_remito": "R-1"}',
        'The export must be a JSON array of delivery notes',
      ],
      ['{"remitos": []}', 'The export must be a JSON array of delivery notes'],
      ['null', 'The export must be a JSON array of delivery notes'],
      [
        '[{"nro_remito": "R-1"}, null, "R-2"]',
        'Entries at positions 1, 2 are not delivery notes (JSON objects)',
      ],
    ])(
      'Given %j, when it is read, then it fails with "%s"',
      (content, message) => {
        expect(() => read(content)).toThrow(new InvalidExportError(message));
      },
    );

    it('Given an export saved as Latin-1, when it is read, then it fails instead of garbling accents', () => {
      expect(() =>
        read(Buffer.from('[{"provincia": "Córdoba"}]', 'latin1')),
      ).toThrow(new InvalidExportError('The export is not valid UTF-8'));
    });
  });
});
