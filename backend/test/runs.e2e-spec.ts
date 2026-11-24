import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import type { JsonObject } from './../src/common/types/json.js';
import {
  CARRIER_CLIENT,
  DeliveryStatus,
  type CarrierClient,
  type DeliveryOutcome,
} from './../src/modules/carriers/carrier-client.js';
import { PROVINCES } from './../src/modules/delivery-notes/schemas/delivery-note.schemas.js';
import type { ValidDeliveryNote } from './../src/modules/delivery-notes/types/delivery-note.types.js';
import { resetDatabase } from './database.js';

/** Stands in for the carrier: scripted outcomes per delivery note, LOADED otherwise. */
class FakeCarrier implements CarrierClient {
  readonly outcomes = new Map<string, DeliveryOutcome[]>();
  readonly provinces = vi.fn(async () => [...PROVINCES]);
  readonly deliver = vi.fn(
    async (request: JsonObject): Promise<DeliveryOutcome> =>
      this.outcomes.get(request.ref as string)?.shift() ?? {
        status: DeliveryStatus.LOADED,
        trackingId: `TRK-${request.ref as string}`,
      },
  );

  toShipmentRequest(note: ValidDeliveryNote): JsonObject {
    return {
      ref: note.number,
      province: note.recipient.province,
      weightKg: note.weightKg,
      service: note.service,
    };
  }
}

const deliveryNote = (
  nro_remito: string,
  transportista: string,
  overrides: JsonObject = {},
  recipient: JsonObject = {},
): JsonObject => ({
  nro_remito,
  destinatario: {
    razon_social: 'Ferretería El Tornillo',
    direccion: 'Sarmiento 3442',
    localidad: 'Pilar',
    provincia: 'Bs. As.',
    codigo_postal: '1629',
    ...recipient,
  },
  bultos: 3,
  peso_kg: '145,1',
  transportista,
  servicio: 'NORMAL',
  ...overrides,
});

/** Every case of the sample export, small: 4 loaded, 4 failed, 4 skipped. */
const EXPORT = [
  deliveryNote('R-1', 'EXPRESO ANDINO'),
  deliveryNote('R-2', 'Cruz del Norte'),
  deliveryNote(
    'R-3',
    'Exp. Andino',
    { servicio: 'URGENTE' },
    { provincia: 'CABA' },
  ),
  deliveryNote('R-4', 'RETIRA CLIENTE'),
  deliveryNote('R-5', 'EXPRESO ANDINO ', {}, { provincia: 'Tucuman' }),
  deliveryNote('R-6', 'TRANSPORTE LITORAL'),
  deliveryNote('R-7', 'expreso andino', {}, { codigo_postal: '' }),
  deliveryNote('R-8', 'Expreso Andino', {}, { direccion: '  ' }),
  deliveryNote('R-9', 'Expreso Andino', { bultos: 0 }),
  deliveryNote('R-10', 'EXPRESO ANDINO'),
  deliveryNote('R-10', 'EXPRESO ANDINO'),
  deliveryNote('R-12', 'Expreso Andino SA'),
];

describe('Runs, reports and shipments (e2e)', () => {
  let app: INestApplication<App>;
  let carrier: FakeCarrier;

  const http = () => request(app.getHttpServer());
  const uploadExport = async (
    content: JsonObject[] = EXPORT,
  ): Promise<string> =>
    (
      await http()
        .post('/exports')
        .attach('file', Buffer.from(JSON.stringify(content)), 'remitos.json')
        .expect(201)
    ).body.id;
  const run = async (content: JsonObject[] = EXPORT) =>
    (
      await http()
        .post('/runs')
        .send({ exportId: await uploadExport(content) })
        .expect(201)
    ).body;
  const attempts = async (query: string) =>
    (await http().get(`/attempts?${query}`).expect(200)).body.items;
  const shipmentOf = async (number: string) =>
    (await http().get(`/shipments?deliveryNoteNumber=${number}`).expect(200))
      .body.items[0];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Each test gets a fresh FakeCarrier; this forwards to the current one.
      .overrideProvider(CARRIER_CLIENT)
      .useValue({
        provinces: () => carrier.provinces(),
        toShipmentRequest: (note: ValidDeliveryNote) =>
          carrier.toShipmentRequest(note),
        deliver: (request: JsonObject) => carrier.deliver(request),
      } satisfies CarrierClient)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    carrier = new FakeCarrier();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario: running an export', () => {
    it('Given an export with every kind of delivery note, when it is run, then the run counts each outcome and breaks it down by step and reason', async () => {
      const body = await run();
      expect(body).toMatchObject({
        kind: 'INITIAL',
        carrier: 'EXPRESO_ANDINO',
        carrierName: 'Expreso Andino',
        status: 'COMPLETED_WITH_FAILURES',
        totals: { total: 12, loaded: 4, failed: 4, skipped: 4 },
      });
      expect(body.breakdown).toEqual(
        expect.arrayContaining([
          { outcome: 'LOADED', step: 'DELIVER', count: 4 },
          {
            outcome: 'FAILED',
            step: 'FILTER',
            cause: 'UNKNOWN_CARRIER',
            count: 1,
          },
          {
            outcome: 'FAILED',
            step: 'VALIDATE',
            cause: 'MISSING_POSTAL_CODE',
            count: 1,
          },
          {
            outcome: 'FAILED',
            step: 'VALIDATE',
            cause: 'MISSING_ADDRESS',
            count: 1,
          },
          {
            outcome: 'FAILED',
            step: 'VALIDATE',
            cause: 'TOO_FEW_PACKAGES',
            count: 1,
          },
          {
            outcome: 'SKIPPED',
            step: 'FILTER',
            cause: 'OTHER_CARRIER',
            count: 2,
          },
          {
            outcome: 'SKIPPED',
            step: 'FILTER',
            cause: 'CUSTOMER_PICKUP',
            count: 1,
          },
          {
            outcome: 'SKIPPED',
            step: 'FILTER',
            cause: 'DUPLICATE_IN_EXPORT',
            count: 1,
          },
        ]),
      );
    });

    it('Given a run, when its failed attempts are listed, then each says, in business terms, why and where it stopped, in export order', async () => {
      const { id } = await run();
      const failed = await attempts(`runId=${id}&outcome=FAILED`);
      expect(
        failed.map((a: JsonObject) => [
          a.deliveryNoteNumber,
          a.reachedStep,
          a.cause,
          a.reason,
          a.retryable,
        ]),
      ).toEqual([
        [
          'R-7',
          'VALIDATE',
          'MISSING_POSTAL_CODE',
          'Postal code is missing',
          true,
        ],
        [
          'R-8',
          'VALIDATE',
          'MISSING_ADDRESS',
          'Recipient address is missing',
          true,
        ],
        [
          'R-9',
          'VALIDATE',
          'TOO_FEW_PACKAGES',
          'Must have at least 1 package (has 0)',
          true,
        ],
        [
          'R-12',
          'FILTER',
          'UNKNOWN_CARRIER',
          'Unrecognized carrier "Expreso Andino SA"; check the delivery note',
          false,
        ],
      ]);
    });

    it('Given dirty values, when loaded, then the carrier receives them normalized', async () => {
      await run();
      expect(carrier.deliver.mock.calls.map(([sent]) => sent)).toEqual([
        {
          ref: 'R-1',
          province: 'Buenos Aires',
          weightKg: 145.1,
          service: 'STANDARD',
        },
        {
          ref: 'R-3',
          province: 'Ciudad Autónoma de Buenos Aires',
          weightKg: 145.1,
          service: 'EXPRESS',
        },
        {
          ref: 'R-5',
          province: 'Tucumán',
          weightKg: 145.1,
          service: 'STANDARD',
        },
        {
          ref: 'R-10',
          province: 'Buenos Aires',
          weightKg: 145.1,
          service: 'STANDARD',
        },
      ]);
      expect(carrier.provinces).toHaveBeenCalledTimes(1);
    });

    it('Given a loaded shipment, when fetched, then it keeps the output of every step', async () => {
      await run();
      const { id } = await shipmentOf('R-1');
      const { body } = await http().get(`/shipments/${id}`).expect(200);
      expect(body).toMatchObject({
        status: 'LOADED',
        lastCompletedStep: 'DELIVER',
        trackingId: 'TRK-R-1',
        normalized: { weightKg: { status: 'VALID', value: 145.1 } },
        payload: { ref: 'R-1', province: 'Buenos Aires' },
      });
    });

    it('Given an export that does not exist, when a run is created for it, then it answers 404', async () => {
      await http().post('/runs').send({ exportId: randomUUID() }).expect(404);
    });

    it('Given no exportId, when a run is created, then it answers 400', async () => {
      await http().post('/runs').send({}).expect(400);
    });
  });

  describe('Scenario: idempotency', () => {
    it('Given an export already run, when it is run again, then nothing is sent twice and the loaded ones count as loaded', async () => {
      const exportId = await uploadExport();
      await http().post('/runs').send({ exportId }).expect(201);
      carrier.deliver.mockClear();

      const { body } = await http()
        .post('/runs')
        .send({ exportId })
        .expect(201);
      expect(carrier.deliver).not.toHaveBeenCalled();
      expect(body.totals).toEqual({
        total: 12,
        loaded: 4,
        failed: 4,
        skipped: 4,
      });
      expect(body.breakdown).toContainEqual({
        outcome: 'LOADED',
        step: 'FILTER',
        count: 4,
      });
    });

    it('Given the carrier already had the shipment, when loaded, then it is simply loaded', async () => {
      carrier.outcomes.set('R-1', [
        { status: DeliveryStatus.LOADED, trackingId: 'TRK-OLD' },
      ]);
      const { id } = await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      expect(await attempts(`runId=${id}`)).toEqual([
        expect.objectContaining({
          outcome: 'LOADED',
          trackingId: 'TRK-OLD',
        }),
      ]);
    });

    it('Given a delivery note loaded earlier, when it comes again with different data, then it fails instead of being sent twice', async () => {
      await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      const { id } = await run([
        deliveryNote('R-1', 'EXPRESO ANDINO', { bultos: 9 }),
      ]);
      expect(await attempts(`runId=${id}`)).toEqual([
        expect.objectContaining({
          outcome: 'FAILED',
          cause: 'LOADED_WITH_DIFFERENT_DATA',
          retryable: false,
        }),
      ]);
      expect(carrier.deliver).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario: retries resume where each shipment stopped', () => {
    it('Given a failed delivery, when the shipment is retried, then only the delivery is repeated, with the stored request', async () => {
      carrier.outcomes.set('R-1', [
        { status: DeliveryStatus.UNAVAILABLE, detail: { status: 503 } },
      ]);
      const first = await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      const stored = carrier.deliver.mock.calls[0][0];
      carrier.deliver.mockClear();
      carrier.provinces.mockClear();

      const shipment = await shipmentOf('R-1');
      expect(shipment).toMatchObject({
        status: 'FAILED',
        failedStep: 'DELIVER',
        cause: 'CARRIER_UNAVAILABLE',
      });
      const { body } = await http()
        .post(`/shipments/${shipment.id}/retries`)
        .expect(201);

      expect(body).toMatchObject({
        kind: 'RETRY',
        parentRunId: first.id,
        totals: { total: 1, loaded: 1 },
      });
      expect(carrier.provinces).not.toHaveBeenCalled();
      expect(carrier.deliver).toHaveBeenCalledExactlyOnceWith(stored);
      expect(await attempts(`runId=${body.id}`)).toEqual([
        expect.objectContaining({
          fromStep: 'DELIVER',
          outcome: 'LOADED',
          trackingId: 'TRK-R-1',
        }),
      ]);
    });

    it('Given a run with failures, when it is retried, then a retry run re-validates its failed shipments', async () => {
      const first = await run();
      const { body } = await http()
        .post(`/runs/${first.id}/retries`)
        .expect(201);
      expect(body).toMatchObject({
        kind: 'RETRY',
        parentRunId: first.id,
        totals: { total: 3, failed: 3 },
      });
      const retried = await attempts(`runId=${body.id}`);
      expect(retried.every((a: JsonObject) => a.fromStep === 'VALIDATE')).toBe(
        true,
      );
    });

    it('Given a run whose failures were fixed, when it is retried again, then it answers 409', async () => {
      carrier.outcomes.set('R-1', [
        { status: DeliveryStatus.UNAVAILABLE, detail: {} },
      ]);
      const first = await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      await http().post(`/runs/${first.id}/retries`).expect(201);
      await http().post(`/runs/${first.id}/retries`).expect(409);
    });

    it('Given a loaded shipment, when it is retried, then it answers 409', async () => {
      await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      const { id } = await shipmentOf('R-1');
      const { body } = await http()
        .post(`/shipments/${id}/retries`)
        .expect(409);
      expect(body.message).toBe(
        `Shipment "${id}" is loaded; only failed shipments can be retried`,
      );
    });
  });

  describe('Scenario: the carrier side fails', () => {
    it('Given the carrier refuses our credentials, when the run delivers, then it stops calling it and the rest fail with the same reason', async () => {
      carrier.outcomes.set('R-1', [{ status: DeliveryStatus.UNAUTHORIZED }]);
      const { id } = await run(
        ['R-1', 'R-2', 'R-3'].map((n) => deliveryNote(n, 'EXPRESO ANDINO')),
      );
      expect(carrier.deliver).toHaveBeenCalledTimes(1);
      expect(
        await attempts(`runId=${id}&cause=INVALID_CARRIER_CREDENTIALS`),
      ).toHaveLength(3);
    });

    it('Given the carrier rejects a shipment, when loaded, then the reason names our field in business terms', async () => {
      carrier.outcomes.set('R-1', [
        {
          status: DeliveryStatus.REJECTED,
          rejections: [{ field: 'postalCode', message: 'invalid' }],
        },
      ]);
      const { id } = await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      expect(await attempts(`runId=${id}`)).toEqual([
        expect.objectContaining({
          reachedStep: 'DELIVER',
          reason: 'The carrier rejected the shipment (postal code: invalid)',
        }),
      ]);
    });
  });

  describe('Scenario: everything is queryable, paged and filtered', () => {
    it('Given two runs, when listed one per page, then each comes exactly once and the last page has no cursor', async () => {
      const ids = [
        (await run([deliveryNote('R-1', 'EXPRESO ANDINO')])).id,
        (await run([deliveryNote('R-2', 'EXPRESO ANDINO')])).id,
      ];
      const page1 = (await http().get('/runs?limit=1').expect(200)).body;
      const page2 = (
        await http().get(`/runs?limit=1&after=${page1.nextCursor}`).expect(200)
      ).body;
      expect(page1.nextCursor).toBe(page1.items[0].id);
      expect(page2.nextCursor).toBeUndefined();
      expect(
        [...page1.items, ...page2.items].map((r: JsonObject) => r.id),
      ).toEqual(expect.arrayContaining(ids));
    });

    it.each([
      ['status=COMPLETED', 1],
      ['status=COMPLETED_WITH_FAILURES', 0],
      ['kind=RETRY', 0],
    ])(
      'Given a clean run, when runs are filtered by %s, then %i come back',
      async (query, count) => {
        await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
        expect(
          (await http().get(`/runs?${query}`).expect(200)).body.items,
        ).toHaveLength(count);
      },
    );

    it('Given shipments, when filtered by status, failed step or reason, then only those come back', async () => {
      await run();
      const failed = (
        await http()
          .get('/shipments?status=FAILED&failedStep=VALIDATE')
          .expect(200)
      ).body.items;
      expect(
        failed.map((s: JsonObject) => s.deliveryNoteNumber).sort(),
      ).toEqual(['R-7', 'R-8', 'R-9']);
      const noPostalCode = (
        await http().get('/shipments?cause=MISSING_POSTAL_CODE').expect(200)
      ).body.items;
      expect(noPostalCode.map((s: JsonObject) => s.deliveryNoteNumber)).toEqual(
        ['R-7'],
      );
    });

    it('Given a retried shipment, when its attempts are listed, then its whole history is there', async () => {
      carrier.outcomes.set('R-1', [
        { status: DeliveryStatus.UNAVAILABLE, detail: {} },
      ]);
      await run([deliveryNote('R-1', 'EXPRESO ANDINO')]);
      const { id } = await shipmentOf('R-1');
      await http().post(`/shipments/${id}/retries`).expect(201);
      expect(
        (await attempts(`shipmentId=${id}`)).map((a: JsonObject) => [
          a.outcome,
          a.cause,
        ]),
      ).toEqual([
        ['FAILED', 'CARRIER_UNAVAILABLE'],
        ['LOADED', undefined],
      ]);
    });

    it.each([
      [`/runs/${randomUUID()}`, 404],
      [`/shipments/${randomUUID()}`, 404],
      ['/runs/not-a-uuid', 400],
      ['/runs?limit=0', 400],
      ['/shipments?status=LOST', 400],
      ['/attempts?step=SHIP', 400],
      ['/attempts?cause=BROKEN', 400],
    ])(
      'Given GET %s, when called, then it answers %i',
      async (path, status) => {
        await http().get(path).expect(status);
      },
    );
  });
});
