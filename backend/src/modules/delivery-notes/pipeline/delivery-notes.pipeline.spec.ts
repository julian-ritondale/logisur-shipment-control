import type { JsonObject } from '../../../common/types/json.js';
import {
  DeliveryStatus,
  type CarrierClient,
  type DeliveryOutcome,
} from '../../carriers/carrier-client.js';
import { Carrier } from '../../carriers/carrier-registry.js';
import type {
  StoredDeliveryNote,
  ValidDeliveryNote,
} from '../types/delivery-note.types.js';
import { deliveryNotesPipeline } from './delivery-notes.pipeline.js';
import { contentHash } from './filter/content-hash.js';
import { normalize } from './normalizer/normalize.js';
import { ReasonCode } from './reasons.js';
import { runStages } from './stage.js';
import { Outcome, Step } from './types/pipeline.types.js';

class FakeCarrier implements CarrierClient {
  readonly provinces = vi.fn(async () => ['Buenos Aires', 'Córdoba']);
  readonly deliver = vi.fn(
    async (request: JsonObject): Promise<DeliveryOutcome> => ({
      status: DeliveryStatus.DELIVERED,
      trackingId: `TRK-${request.ref as string}`,
    }),
  );

  toShipmentRequest(note: ValidDeliveryNote): JsonObject {
    return { ref: note.number };
  }
}

const deliveryNote = (
  number: string,
  overrides: JsonObject = {},
): JsonObject => ({
  nro_remito: number,
  transportista: 'EXPRESO ANDINO',
  destinatario: {
    razon_social: 'Ferretería El Tornillo',
    direccion: 'Sarmiento 3442',
    localidad: 'Pilar',
    provincia: 'BA',
    codigo_postal: '1629',
  },
  bultos: 2,
  peso_kg: '12,5',
  servicio: 'NORMAL',
  ...overrides,
});

const stored = (...raws: JsonObject[]): StoredDeliveryNote[] =>
  raws.map((raw, position) => ({
    id: `dn-${position}`,
    exportId: 'export',
    position,
    raw,
  }));

describe('deliveryNotesPipeline', () => {
  let carrier: FakeCarrier;

  beforeEach(() => {
    carrier = new FakeCarrier();
  });

  const pipeline = (delivered = new Map()) =>
    deliveryNotesPipeline({
      carrier: Carrier.EXPRESO_ANDINO,
      client: carrier,
      delivered,
    });

  const process = (p: ReturnType<typeof pipeline>, raw: JsonObject) =>
    runStages(p.stages, Step.VALIDATE, normalize(raw), async () => {});

  describe('Scenario: selecting the delivery notes of an export (NORMALIZE → FILTER)', () => {
    it('Given an export with every case, when selected, then only this carrier’s numbered, unique, unsent ones go on', () => {
      const sent = deliveryNote('R-5');
      const delivered = new Map([
        [
          'R-5',
          {
            shipmentId: 's-5',
            trackingId: 'TRK-OLD',
            contentHash: contentHash(normalize(sent)),
          },
        ],
      ]);
      const { kept, decided } = pipeline(delivered).select(
        stored(
          deliveryNote('R-1'),
          deliveryNote('R-2', { transportista: 'Cruz del Norte' }),
          deliveryNote(''),
          deliveryNote('R-4'),
          deliveryNote('R-4'),
          sent,
          deliveryNote('R-6', { transportista: 'RETIRA CLIENTE' }),
        ),
      );
      expect(kept.map((c) => c.deliveryNoteId)).toEqual(['dn-0', 'dn-3']);
      expect(
        decided.map(({ candidate, decision }) => [
          candidate.position,
          decision.outcome,
        ]),
      ).toEqual([
        [1, Outcome.SKIPPED],
        [6, Outcome.SKIPPED],
        [2, Outcome.FAILED],
        [4, Outcome.SKIPPED],
        [5, Outcome.DELIVERED],
      ]);
    });
  });

  describe('Scenario: one delivery note through VALIDATE → MAP → DELIVER', () => {
    it('Given a valid delivery note, when its stages run, then it is delivered with a tracking id', async () => {
      expect(await process(pipeline(), deliveryNote('R-1'))).toEqual({
        ok: true,
        value: { trackingId: 'TRK-R-1' },
      });
      expect(carrier.deliver).toHaveBeenCalledWith({ ref: 'R-1' });
    });

    it('Given several delivery notes in a run, when validated, then the carrier’s provinces are fetched once', async () => {
      const p = pipeline();
      await process(p, deliveryNote('R-1'));
      await process(p, deliveryNote('R-2'));
      expect(carrier.provinces).toHaveBeenCalledTimes(1);
    });

    it('Given a province the carrier does not serve, when validated, then it stops at VALIDATE', async () => {
      const raw = deliveryNote('R-1', {
        destinatario: {
          ...(deliveryNote('x').destinatario as JsonObject),
          provincia: 'Tucuman',
        },
      });
      expect(await process(pipeline(), raw)).toMatchObject({
        ok: false,
        failure: { step: Step.VALIDATE, code: ReasonCode.PROVINCE_NOT_SERVED },
      });
      expect(carrier.deliver).not.toHaveBeenCalled();
    });

    it('Given the carrier refuses our credentials, when the next delivery note is delivered, then the carrier is not called again', async () => {
      carrier.deliver.mockResolvedValueOnce({
        status: DeliveryStatus.UNAUTHORIZED,
      });
      const p = pipeline();
      await process(p, deliveryNote('R-1'));
      expect(await process(p, deliveryNote('R-2'))).toMatchObject({
        ok: false,
        failure: { code: ReasonCode.INVALID_CARRIER_CREDENTIALS },
      });
      expect(carrier.deliver).toHaveBeenCalledTimes(1);
    });

    it('Given the carrier is down when asked for provinces, when validated, then it fails as unavailable and is not asked again in the run', async () => {
      carrier.provinces.mockRejectedValue(new Error('down'));
      const p = pipeline();
      for (const number of ['R-1', 'R-2']) {
        expect(await process(p, deliveryNote(number))).toMatchObject({
          ok: false,
          failure: {
            step: Step.VALIDATE,
            code: ReasonCode.CARRIER_UNAVAILABLE,
          },
        });
      }
      expect(carrier.provinces).toHaveBeenCalledTimes(1);
    });

    it('Given no integration for the carrier, when processed, then it fails at VALIDATE as not deliverable yet', async () => {
      const p = deliveryNotesPipeline({ carrier: Carrier.CRUZ_DEL_NORTE });
      expect(
        await runStages(
          p.stages,
          Step.VALIDATE,
          normalize(deliveryNote('R-1')),
          async () => {},
        ),
      ).toMatchObject({
        ok: false,
        failure: {
          step: Step.VALIDATE,
          code: ReasonCode.NO_CARRIER_INTEGRATION,
        },
      });
    });

    it('Given a stored request, when the stages run from DELIVER, then it is resent without validating or mapping', async () => {
      expect(
        await runStages(
          pipeline().stages,
          Step.DELIVER,
          { ref: 'R-9' },
          async () => {},
        ),
      ).toEqual({
        ok: true,
        value: { trackingId: 'TRK-R-9' },
      });
      expect(carrier.provinces).not.toHaveBeenCalled();
    });
  });
});
