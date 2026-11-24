import type { JsonObject } from '../../../../common/types/json.js';
import { Carrier } from '../../../carriers/carrier-registry.js';
import { normalize } from '../normalizer/normalize.js';
import { ReasonCode } from '../reasons.js';
import { Outcome } from '../types/pipeline.types.js';
import { contentHash } from './content-hash.js';
import {
  alreadyDelivered,
  byCarrier,
  composeFilters,
  dedupeWithinExport,
  hasNumber,
  type Candidate,
  type FilterResult,
} from './filters.js';

let nextId = 0;
const candidate = (overrides: JsonObject = {}): Candidate => {
  nextId += 1;
  return {
    deliveryNoteId: `dn-${nextId}`,
    position: nextId,
    normalized: normalize({
      nro_remito: `R-${nextId}`,
      transportista: 'EXPRESO ANDINO',
      bultos: 1,
      ...overrides,
    }),
  };
};

const codes = ({ decided }: FilterResult) =>
  decided.map(({ decision }) => [
    decision.outcome,
    'reason' in decision ? decision.reason.code : undefined,
  ]);

describe('filters', () => {
  describe('Scenario: keeping one carrier', () => {
    it('Given every carrier, when filtered by Expreso Andino, then only its delivery notes are kept, in order', () => {
      const andino = candidate({ transportista: 'Exp. Andino' });
      const cruz = candidate({ transportista: 'Cruz del Norte' });
      const andino2 = candidate({ transportista: 'expreso andino' });
      expect(
        byCarrier(Carrier.EXPRESO_ANDINO)([andino, cruz, andino2]).kept,
      ).toEqual([andino, andino2]);
    });

    it.each([
      ['CRUZ DEL NORTE', Outcome.SKIPPED, ReasonCode.OTHER_CARRIER],
      ['RETIRA CLIENTE', Outcome.SKIPPED, ReasonCode.CUSTOMER_PICKUP],
      ['Expreso Andino SA', Outcome.FAILED, ReasonCode.UNKNOWN_CARRIER],
      ['  ', Outcome.FAILED, ReasonCode.MISSING_CARRIER],
    ])(
      'Given transportista %j, when filtered by Expreso Andino, then it is %s as %s',
      (transportista, outcome, code) => {
        expect(
          codes(
            byCarrier(Carrier.EXPRESO_ANDINO)([candidate({ transportista })]),
          ),
        ).toEqual([[outcome, code]]);
      },
    );

    it('Given a delivery note for another carrier, when skipped, then the message names that carrier', () => {
      const { decided } = byCarrier(Carrier.EXPRESO_ANDINO)([
        candidate({ transportista: 'Cruz del Norte' }),
      ]);
      expect(decided[0].decision).toEqual({
        outcome: Outcome.SKIPPED,
        reason: {
          code: ReasonCode.OTHER_CARRIER,
          message: 'Assigned to another carrier (Cruz del Norte)',
        },
      });
    });
  });

  describe('Scenario: delivery notes without a number', () => {
    it('Given no nro_remito, when filtered, then it fails: there is no reference for the carrier', () => {
      expect(codes(hasNumber()([candidate({ nro_remito: '' })]))).toEqual([
        [Outcome.FAILED, ReasonCode.MISSING_DELIVERY_NOTE_NUMBER],
      ]);
    });
  });

  describe('Scenario: repeated delivery notes in the export', () => {
    it('Given R-10000507 twice with the same data, when deduplicated, then the first is kept and the second skipped', () => {
      const first = candidate({ nro_remito: 'R-10000507' });
      const second = { ...first, deliveryNoteId: 'copy' };
      const result = dedupeWithinExport()([first, second]);
      expect(result.kept).toEqual([first]);
      expect(result.decided[0].decision).toMatchObject({
        reason: {
          message:
            'Delivery note R-10000507 appears 2 times in the export with the same data; it is sent once',
        },
      });
    });

    it('Given the same number with different data, when deduplicated, then every copy fails (none is guessed)', () => {
      const result = dedupeWithinExport()([
        candidate({ nro_remito: 'R-9', bultos: 1 }),
        candidate({ nro_remito: 'R-9', bultos: 2 }),
      ]);
      expect(result.kept).toEqual([]);
      expect(codes(result)).toEqual([
        [Outcome.FAILED, ReasonCode.CONFLICTING_DUPLICATE],
        [Outcome.FAILED, ReasonCode.CONFLICTING_DUPLICATE],
      ]);
    });
  });

  describe('Scenario: delivery notes delivered by an earlier run', () => {
    it('Given the same data, when filtered, then it counts as delivered with its tracking id (idempotent)', () => {
      const sent = candidate({ nro_remito: 'R-1' });
      const delivered = new Map([
        [
          'R-1',
          {
            shipmentId: 's-1',
            trackingId: 'AND123',
            contentHash: contentHash(sent.normalized),
          },
        ],
      ]);
      expect(alreadyDelivered(delivered)([sent]).decided[0].decision).toEqual({
        outcome: Outcome.DELIVERED,
        shipmentId: 's-1',
        trackingId: 'AND123',
      });
    });

    it('Given different data now, when filtered, then it fails so someone corrects it with the carrier', () => {
      const changed = candidate({ nro_remito: 'R-1', bultos: 9 });
      const delivered = new Map([
        [
          'R-1',
          { shipmentId: 's-1', trackingId: 'AND123', contentHash: 'old' },
        ],
      ]);
      expect(codes(alreadyDelivered(delivered)([changed]))).toEqual([
        [Outcome.FAILED, ReasonCode.DELIVERED_WITH_DIFFERENT_DATA],
      ]);
    });
  });

  describe('Scenario: composing filters', () => {
    it('Given no filters, when composed, then everything is kept', () => {
      const all = [candidate(), candidate()];
      expect(composeFilters()(all)).toEqual({ kept: all, decided: [] });
    });

    it('Given the same filters in another order, when composed, then each sees only what the previous kept', () => {
      const cruz1 = candidate({
        nro_remito: 'R-7',
        transportista: 'Cruz del Norte',
        bultos: 1,
      });
      const cruz2 = candidate({
        nro_remito: 'R-7',
        transportista: 'Cruz del Norte',
        bultos: 2,
      });
      const carrierFirst = composeFilters(
        byCarrier(Carrier.EXPRESO_ANDINO),
        dedupeWithinExport(),
      );
      const dedupeFirst = composeFilters(
        dedupeWithinExport(),
        byCarrier(Carrier.EXPRESO_ANDINO),
      );

      expect(codes(carrierFirst([cruz1, cruz2]))).toEqual([
        [Outcome.SKIPPED, ReasonCode.OTHER_CARRIER],
        [Outcome.SKIPPED, ReasonCode.OTHER_CARRIER],
      ]);
      expect(codes(dedupeFirst([cruz1, cruz2]))).toEqual([
        [Outcome.FAILED, ReasonCode.CONFLICTING_DUPLICATE],
        [Outcome.FAILED, ReasonCode.CONFLICTING_DUPLICATE],
      ]);
    });

    it('Given candidates, when filtered, then the input is not modified', () => {
      const all = [candidate(), candidate({ transportista: 'Cruz del Norte' })];
      const copy = [...all];
      composeFilters(
        byCarrier(Carrier.EXPRESO_ANDINO),
        hasNumber(),
        dedupeWithinExport(),
      )(all);
      expect(all).toEqual(copy);
    });
  });
});
