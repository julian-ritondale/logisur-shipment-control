import { invalid, MISSING, valid } from '../../common/types/field.js';
import {
  Carrier,
  carrierName,
  DELIVERABLE_CARRIERS,
  isCarrier,
  resolveCarrier,
} from './carrier-registry.js';

describe('carrier registry', () => {
  describe('Scenario: every spelling found in the 2026-09-30 export is recognized', () => {
    it.each([
      ['EXPRESO ANDINO', Carrier.EXPRESO_ANDINO],
      ['Expreso Andino', Carrier.EXPRESO_ANDINO],
      ['EXPRESO ANDINO ', Carrier.EXPRESO_ANDINO],
      ['Exp. Andino', Carrier.EXPRESO_ANDINO],
      ['expreso andino', Carrier.EXPRESO_ANDINO],
      ['Cruz del Norte', Carrier.CRUZ_DEL_NORTE],
      ['CRUZ DEL NORTE', Carrier.CRUZ_DEL_NORTE],
      ['TRANSPORTE LITORAL', Carrier.TRANSPORTE_LITORAL],
      ['RETIRA CLIENTE', Carrier.CUSTOMER_PICKUP],
    ])(
      'Given transportista %j, when it is resolved, then it is %s',
      (raw, carrier) => {
        expect(resolveCarrier(raw)).toEqual(valid(carrier));
      },
    );
  });

  describe('Scenario: harmless variants not (yet) seen are recognized', () => {
    it.each([
      ['  EXPRESO ANDINO', 'leading spaces'],
      ['\tExpreso Andino\n', 'tab and newline around it'],
      ['EXPRESO   ANDINO', 'several spaces between words'],
      ['EXPRESO\u00A0ANDINO', 'non-breaking space'],
      ['eXpReSo AnDiNo', 'mixed case'],
      ['EXP. ANDINO', 'abbreviation in upper case'],
      ['Exp.Andino', 'abbreviation with no space after the dot'],
      ['Exp Andino', 'abbreviation without the dot'],
    ])(
      'Given transportista %j (%s), when it is resolved, then it is Expreso Andino',
      (raw) => {
        expect(resolveCarrier(raw)).toEqual(valid(Carrier.EXPRESO_ANDINO));
      },
    );
  });

  describe('Scenario: values only close to a carrier are not guessed', () => {
    it.each([
      ['Andino', 'only one word'],
      ['Expreso', 'only the first word'],
      ['EXPRESO ANDINOS', 'plural'],
      ['Expreso Andino SA', 'a company suffix'],
      ['Transporte Andino', 'a different first word'],
      ['Expreso Andina', 'misspelled'],
      ['EXPRESOANDINO', 'words glued together'],
      ['Expreso-Andino', 'hyphen instead of space'],
      ['OCA', 'an unknown carrier'],
    ])(
      'Given transportista %j (%s), when it is resolved, then it is invalid with its raw value',
      (raw) => {
        expect(resolveCarrier(raw)).toEqual(invalid(raw));
      },
    );

    it.each([
      [42, '42'],
      [true, 'true'],
      [['EXPRESO ANDINO'], '["EXPRESO ANDINO"]'],
    ])(
      'Given transportista %j (not text), when it is resolved, then it is invalid, not coerced',
      (raw, text) => {
        expect(resolveCarrier(raw)).toEqual(invalid(text));
      },
    );

    it.each([[undefined], [null], [''], ['   ']])(
      'Given transportista %j, when it is resolved, then it is missing',
      (raw) => {
        expect(resolveCarrier(raw)).toEqual(MISSING);
      },
    );
  });

  describe('Scenario: names and ids', () => {
    it('Given a carrier, when its name is asked, then it is the business name', () => {
      expect(carrierName(Carrier.CRUZ_DEL_NORTE)).toBe('Cruz del Norte');
    });

    it('Given the carriers, when the deliverable ones are listed, then customer pickup is not among them', () => {
      expect(DELIVERABLE_CARRIERS).not.toContain(Carrier.CUSTOMER_PICKUP);
      expect(DELIVERABLE_CARRIERS).toContain(Carrier.EXPRESO_ANDINO);
    });

    it.each([
      ['EXPRESO_ANDINO', true],
      ['expreso_andino', false],
      ['OCA', false],
    ])(
      'Given %j, when checked as a carrier id, then it is %s',
      (value, expected) => {
        expect(isCarrier(value)).toBe(expected);
      },
    );
  });
});
