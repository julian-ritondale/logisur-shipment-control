import type { JsonObject } from '../../../../common/types/json.js';
import { Service } from '../../schemas/delivery-note.schemas.js';
import { normalize } from '../normalizer/normalize.js';
import { ReasonCode } from '../reasons.js';
import { Step } from '../types/pipeline.types.js';
import { validate } from './validate.js';

const SERVED = new Set([
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
]);

const deliveryNote = (overrides: JsonObject = {}, recipient: JsonObject = {}) =>
  normalize({
    nro_remito: 'R-1',
    destinatario: {
      razon_social: 'Ferretería El Tornillo',
      direccion: 'Sarmiento 3442',
      localidad: 'Córdoba',
      provincia: 'Cba',
      codigo_postal: '5000',
      telefono: '1146366340',
      ...recipient,
    },
    bultos: 7,
    peso_kg: '80,6',
    valor_declarado: 849149.6,
    servicio: 'URGENTE',
    ...overrides,
  });

const failureOf = (overrides: JsonObject = {}, recipient: JsonObject = {}) => {
  const result = validate(deliveryNote(overrides, recipient), SERVED);
  if (result.ok) {
    throw new Error('expected a failure');
  }
  return result.failure;
};

describe('validate', () => {
  describe('Scenario: a delivery note the carrier can take', () => {
    it('Given every field right, when validated, then it is valid with carrier-ready values', () => {
      expect(validate(deliveryNote(), SERVED)).toEqual({
        ok: true,
        value: {
          number: 'R-1',
          recipient: {
            name: 'Ferretería El Tornillo',
            street: 'Sarmiento 3442',
            city: 'Córdoba',
            province: 'Córdoba',
            postalCode: '5000',
            phone: '1146366340',
          },
          packages: 7,
          weightKg: 80.6,
          declaredValue: 849149.6,
          service: Service.EXPRESS,
        },
      });
    });

    it('Given no phone and no declared value (both optional), when validated, then it is valid', () => {
      expect(
        validate(
          deliveryNote({ valor_declarado: null }, { telefono: '' }),
          SERVED,
        ).ok,
      ).toBe(true);
    });
  });

  describe('Scenario: the problems found in the sample export', () => {
    it.each([
      [
        'an empty postal code (R-10000477)',
        {},
        { codigo_postal: '' },
        ReasonCode.MISSING_POSTAL_CODE,
        'Postal code is missing',
      ],
      [
        'a blank address (R-10000516)',
        {},
        { direccion: '  ' },
        ReasonCode.MISSING_ADDRESS,
        'Recipient address is missing',
      ],
      [
        '0 packages (R-10000541)',
        { bultos: 0 },
        {},
        ReasonCode.TOO_FEW_PACKAGES,
        'Must have at least 1 package (has 0)',
      ],
    ])(
      'Given %s, when validated, then it fails at VALIDATE with %s',
      (_case, overrides, recipient, code, message) => {
        expect(failureOf(overrides, recipient)).toEqual({
          step: Step.VALIDATE,
          code,
          message,
          issues: [{ code, message }],
        });
      },
    );
  });

  describe('Scenario: every other rule', () => {
    it.each([
      [
        { nro_remito: '' },
        {},
        ReasonCode.MISSING_DELIVERY_NOTE_NUMBER,
        'The delivery note has no number',
      ],
      [
        {},
        { razon_social: '' },
        ReasonCode.MISSING_RECIPIENT_NAME,
        'Recipient name is missing',
      ],
      [
        {},
        { localidad: null },
        ReasonCode.MISSING_CITY,
        'Recipient city is missing',
      ],
      [
        {},
        { provincia: '' },
        ReasonCode.MISSING_PROVINCE,
        'Recipient province is missing',
      ],
      [
        {},
        { provincia: 'Patagonia' },
        ReasonCode.UNKNOWN_PROVINCE,
        'Province "Patagonia" is not recognized',
      ],
      [
        {},
        { provincia: 'Mendoza' },
        ReasonCode.PROVINCE_NOT_SERVED,
        "The carrier doesn't deliver to Mendoza",
      ],
      [
        { bultos: null },
        {},
        ReasonCode.MISSING_PACKAGES,
        'Number of packages is missing',
      ],
      [
        { bultos: 'dos' },
        {},
        ReasonCode.INVALID_PACKAGES,
        'Number of packages "dos" is not a whole number',
      ],
      [{ peso_kg: '' }, {}, ReasonCode.MISSING_WEIGHT, 'Weight is missing'],
      [
        { peso_kg: '12 kg' },
        {},
        ReasonCode.INVALID_WEIGHT,
        'Weight "12 kg" is not a number',
      ],
      [
        { peso_kg: '0,0' },
        {},
        ReasonCode.NON_POSITIVE_WEIGHT,
        'Weight must be greater than 0 kg (is 0)',
      ],
      [
        { valor_declarado: 'mucho' },
        {},
        ReasonCode.INVALID_DECLARED_VALUE,
        'Declared value "mucho" is not a number',
      ],
      [
        { valor_declarado: -5 },
        {},
        ReasonCode.NEGATIVE_DECLARED_VALUE,
        "Declared value can't be negative (is -5)",
      ],
      [
        { servicio: '' },
        {},
        ReasonCode.MISSING_SERVICE,
        'Service (NORMAL or URGENTE) is missing',
      ],
      [
        { servicio: 'EXPRESS' },
        {},
        ReasonCode.UNKNOWN_SERVICE,
        'Service "EXPRESS" is unknown (expected NORMAL or URGENTE)',
      ],
    ])(
      'Given %j with recipient %j, when validated, then it fails with %s: %s',
      (overrides, recipient, code, message) => {
        expect(failureOf(overrides, recipient)).toMatchObject({
          step: Step.VALIDATE,
          code,
          message,
        });
      },
    );
  });

  describe('Scenario: several problems at once', () => {
    it('Given no postal code and 0 packages, when validated, then both are reported, the first one as its code', () => {
      const failure = failureOf({ bultos: 0 }, { codigo_postal: '' });
      expect(failure.code).toBe(ReasonCode.MISSING_POSTAL_CODE);
      expect(failure.message).toBe(
        'Postal code is missing; Must have at least 1 package (has 0)',
      );
      expect(failure.issues?.map((issue) => issue.code)).toEqual([
        ReasonCode.MISSING_POSTAL_CODE,
        ReasonCode.TOO_FEW_PACKAGES,
      ]);
    });
  });
});
