import { invalid, MISSING, valid } from '../../../../common/types/field.js';
import type { JsonObject } from '../../../../common/types/json.js';
import { Carrier } from '../../../carriers/carrier-registry.js';
import { Service } from '../../../delivery-notes/schemas/delivery-note.schemas.js';
import { normalize } from './normalize.js';

const recipient = {
  razon_social: 'Ferretería El Tornillo',
  direccion: 'Sarmiento 3442',
  localidad: 'Córdoba',
  provincia: 'Córdoba',
  codigo_postal: '5000',
  telefono: '1146366340',
};

const deliveryNote = (
  overrides: JsonObject = {},
  recipientOverrides: JsonObject = {},
): JsonObject => ({
  nro_remito: 'R-1',
  destinatario: { ...recipient, ...recipientOverrides },
  bultos: 7,
  peso_kg: 80.6,
  valor_declarado: 849149.6,
  transportista: 'EXPRESO ANDINO',
  servicio: 'NORMAL',
  ...overrides,
});

describe('normalize', () => {
  describe('Scenario: a clean delivery note', () => {
    it('Given every field right, when it is normalized, then every field is valid', () => {
      expect(normalize(deliveryNote())).toEqual({
        number: valid('R-1'),
        carrier: valid(Carrier.EXPRESO_ANDINO),
        recipient: {
          name: valid('Ferretería El Tornillo'),
          street: valid('Sarmiento 3442'),
          city: valid('Córdoba'),
          province: valid('Córdoba'),
          postalCode: valid('5000'),
          phone: valid('1146366340'),
        },
        packages: valid(7),
        weightKg: valid(80.6),
        declaredValue: valid(849149.6),
        service: valid(Service.STANDARD),
      });
    });
  });

  describe('Scenario: provinces found in the export', () => {
    it.each([
      ['BA', 'Buenos Aires'],
      ['Bs. As.', 'Buenos Aires'],
      ['CABA', 'Ciudad Autónoma de Buenos Aires'],
      ['Capital Federal', 'Ciudad Autónoma de Buenos Aires'],
      ['Cba', 'Córdoba'],
      ['Tucuman', 'Tucumán'],
      ['Neuquen', 'Neuquén'],
      ['Entre Ríos', 'Entre Ríos'],
    ])(
      'Given provincia %j, when it is normalized, then it is %j',
      (provincia, name) => {
        expect(
          normalize(deliveryNote({}, { provincia })).recipient.province,
        ).toEqual(valid(name));
      },
    );

    it.each([
      ['C.A.B.A.', 'Ciudad Autónoma de Buenos Aires'],
      ['  buenos   aires ', 'Buenos Aires'],
      ['Pcia. de Buenos Aires', 'Buenos Aires'],
      ['Rio Negro', 'Río Negro'],
    ])(
      'Given provincia %j (not yet seen), when it is normalized, then it is %j',
      (provincia, name) => {
        expect(
          normalize(deliveryNote({}, { provincia })).recipient.province,
        ).toEqual(valid(name));
      },
    );

    it.each([['Patagonia'], ['Bs As Norte'], ['Uruguay']])(
      'Given provincia %j, when it is normalized, then it is invalid (not guessed)',
      (provincia) => {
        expect(
          normalize(deliveryNote({}, { provincia })).recipient.province,
        ).toEqual(invalid(provincia));
      },
    );
  });

  describe('Scenario: numbers written in different ways', () => {
    it.each([
      [80.6, 80.6],
      ['145,1', 145.1],
      ['12.5', 12.5],
      [' 37,2 ', 37.2],
      [0, 0],
    ])(
      'Given peso_kg %j, when it is normalized, then the weight is %d',
      (peso_kg, weight) => {
        expect(normalize(deliveryNote({ peso_kg })).weightKg).toEqual(
          valid(weight),
        );
      },
    );

    it.each([
      ['1.234,5', '1.234,5'],
      ['12 kg', '12 kg'],
      [true, 'true'],
    ])(
      'Given peso_kg %j, when it is normalized, then it is invalid with its raw text (not guessed)',
      (peso_kg, raw) => {
        expect(normalize(deliveryNote({ peso_kg })).weightKg).toEqual(
          invalid(raw),
        );
      },
    );

    it.each([
      [2.5, '2.5'],
      ['dos', 'dos'],
    ])(
      'Given bultos %j, when it is normalized, then it is invalid (not a whole number)',
      (bultos, raw) => {
        expect(normalize(deliveryNote({ bultos })).packages).toEqual(
          invalid(raw),
        );
      },
    );

    it('Given bultos 0 (as in R-10000541), when it is normalized, then it is valid; VALIDATE rejects it', () => {
      expect(normalize(deliveryNote({ bultos: 0 })).packages).toEqual(valid(0));
    });
  });

  describe('Scenario: services', () => {
    it.each([
      ['NORMAL', Service.STANDARD],
      ['URGENTE', Service.EXPRESS],
      [' urgente ', Service.EXPRESS],
    ])(
      'Given servicio %j, when it is normalized, then it is %s',
      (servicio, service) => {
        expect(normalize(deliveryNote({ servicio })).service).toEqual(
          valid(service),
        );
      },
    );

    it('Given servicio "EXPRESS" (not a LogiSur value), when it is normalized, then it is invalid', () => {
      expect(normalize(deliveryNote({ servicio: 'EXPRESS' })).service).toEqual(
        invalid('EXPRESS'),
      );
    });
  });

  describe('Scenario: missing and blank values', () => {
    it.each([
      [
        'an empty codigo_postal (R-10000477)',
        { codigo_postal: '' },
        'postalCode',
      ],
      ['a blank direccion (R-10000516)', { direccion: '  ' }, 'street'],
      ['a null telefono', { telefono: null }, 'phone'],
    ] as const)(
      'Given %s, when it is normalized, then that field is missing',
      (_case, overrides, field) => {
        expect(normalize(deliveryNote({}, overrides)).recipient[field]).toEqual(
          MISSING,
        );
      },
    );

    it('Given extra spaces inside text, when it is normalized, then they are collapsed', () => {
      expect(
        normalize(
          deliveryNote({}, { razon_social: '  Ferretería   El  Tornillo ' }),
        ).recipient.name,
      ).toEqual(valid('Ferretería El Tornillo'));
    });

    it('Given a numeric codigo_postal, when it is normalized, then it becomes text', () => {
      expect(
        normalize(deliveryNote({}, { codigo_postal: 5000 })).recipient
          .postalCode,
      ).toEqual(valid('5000'));
    });

    it.each([[null], ['Sarmiento 3442'], [[1, 2]]])(
      'Given destinatario %j (not an object), when it is normalized, then every recipient field is missing',
      (destinatario) => {
        const { recipient: fields } = normalize(deliveryNote({ destinatario }));
        expect(Object.values(fields)).toEqual(
          Array(Object.keys(fields).length).fill(MISSING),
        );
      },
    );

    it('Given an empty object, when it is normalized, then nothing throws and everything is missing', () => {
      const normalized = normalize({});
      expect(normalized.number).toEqual(MISSING);
      expect(normalized.carrier).toEqual(MISSING);
    });
  });
});
