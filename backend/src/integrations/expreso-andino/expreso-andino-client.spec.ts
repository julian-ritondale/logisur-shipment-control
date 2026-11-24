import type { JsonObject } from '../../common/types/json.js';
import {
  CarrierRequestError,
  DeliveryStatus,
} from '../../modules/carriers/carrier-client.js';
import { Service } from '../../modules/delivery-notes/schemas/delivery-note.schemas.js';
import type { ValidDeliveryNote } from '../../modules/delivery-notes/types/delivery-note.types.js';
import { ExpresoAndinoClient } from './expreso-andino-client.js';

type Reply = Response | Error;

/** A fetch that answers from a script and records every call. */
function scriptedFetch(...replies: Reply[]) {
  const calls: { method: string; url: string; init: RequestInit }[] = [];
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? 'GET', url, init });
    const reply = replies.shift();
    if (!reply) {
      throw new Error(`Unexpected call: ${init.method} ${url}`);
    }
    if (reply instanceof Error) {
      throw reply;
    }
    return reply;
  });
  return { fetchFn, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const client = (fetchFn: ReturnType<typeof scriptedFetch>['fetchFn']) =>
  new ExpresoAndinoClient(
    {
      baseUrl: 'http://carrier.test/',
      apiKey: 'secret-key',
      attempts: 4,
      backoff: { delay: 0, jitter: 'none' },
    },
    fetchFn,
  );

const request: JsonObject = {
  external_ref: 'R-10000507',
  recipient: {
    name: 'Maderera El Pino',
    street: 'Urquiza 3254',
    city: 'Paraná',
    province: 'Entre Ríos',
    zip_code: '3100',
  },
  packages: 5,
  weight_kg: 121.8,
  service: 'express',
};

const routes = (calls: { method: string; url: string }[]) =>
  calls.map((c) => `${c.method} ${c.url.replace('http://carrier.test', '')}`);

describe('ExpresoAndinoClient', () => {
  describe('Scenario: mapping a valid remito to the API format', () => {
    const remito: ValidDeliveryNote = {
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
      service: Service.STANDARD,
    };

    it('Given a complete remito, when mapped, then every field follows the AGENTS.md mapping table', () => {
      expect(client(scriptedFetch().fetchFn).toShipmentRequest(remito)).toEqual(
        {
          external_ref: 'R-1',
          recipient: {
            name: 'Ferretería El Tornillo',
            street: 'Sarmiento 3442',
            city: 'Córdoba',
            province: 'Córdoba',
            zip_code: '5000',
            phone: '1146366340',
          },
          packages: 7,
          weight_kg: 80.6,
          declared_value: 849149.6,
          service: 'standard',
        },
      );
    });

    it('Given an URGENTE remito without phone or declared value, when mapped, then the service is express and the optional fields are left out', () => {
      const mapped = client(scriptedFetch().fetchFn).toShipmentRequest({
        ...remito,
        recipient: { ...remito.recipient, phone: undefined },
        declaredValue: undefined,
        service: Service.EXPRESS,
      });
      expect(mapped.service).toBe('express');
      const sent = JSON.parse(JSON.stringify(mapped)) as JsonObject;
      expect(sent.recipient).not.toHaveProperty('phone');
      expect(sent).not.toHaveProperty('declared_value');
    });
  });

  describe('Scenario: delivering, the simple answers', () => {
    it('Given the API answers 201, when delivered, then it is DELIVERED with the tracking id, in a single call with the API key', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(201, { tracking_id: 'AND1A2B3C4D', external_ref: 'R-10000507' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'AND1A2B3C4D',
      });
      expect(routes(calls)).toEqual(['POST /v1/shipments']);
      expect(calls[0].init.headers).toMatchObject({
        'X-Api-Key': 'secret-key',
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(calls[0].init.body as string)).toEqual(request);
    });

    it('Given the API answers 409 duplicate, when delivered, then it is DELIVERED with the existing tracking id (idempotent)', async () => {
      const { fetchFn } = scriptedFetch(
        json(409, { error: 'duplicate', tracking_id: 'ANDEXISTING' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDEXISTING',
      });
    });

    it('Given the API answers 422, when delivered, then it is REJECTED naming our field, and not retried', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(422, {
          error: 'validation_error',
          details: [{ field: 'recipient.zip_code', message: 'required' }],
        }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.REJECTED,
        rejections: [{ field: 'postalCode', message: 'required' }],
      });
      expect(calls).toHaveLength(1);
    });

    it('Given the API answers 401, when delivered, then it is UNAUTHORIZED and not retried', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(401, { error: 'unauthorized' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.UNAUTHORIZED,
      });
      expect(calls).toHaveLength(1);
    });
  });

  describe('Scenario: ambiguous failures are looked up before sending again (idempotency)', () => {
    it('Given a 500 that did create the shipment, when delivered, then the lookup finds it and it is not POSTed again', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(500, { error: 'internal' }),
        json(200, {
          items: [{ tracking_id: 'ANDCREATED', external_ref: 'R-10000507' }],
        }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDCREATED',
      });
      expect(routes(calls)).toEqual([
        'POST /v1/shipments',
        'GET /v1/shipments?external_ref=R-10000507',
      ]);
    });

    it('Given a 500 that did not create it, when delivered, then after an empty lookup it is POSTed again', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(500, { error: 'internal' }),
        json(200, { items: [] }),
        json(201, { tracking_id: 'ANDNEW' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDNEW',
      });
      expect(routes(calls)).toEqual([
        'POST /v1/shipments',
        'GET /v1/shipments?external_ref=R-10000507',
        'POST /v1/shipments',
      ]);
    });

    it('Given a 503 and then a 409 on the second POST, when delivered, then it is DELIVERED', async () => {
      const { fetchFn } = scriptedFetch(
        json(503, { error: 'unavailable' }),
        json(200, { items: [] }),
        json(409, { error: 'duplicate', tracking_id: 'ANDDUP' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDDUP',
      });
    });

    it('Given a network error, when delivered, then it is treated like a 500: looked up and retried', async () => {
      const { fetchFn, calls } = scriptedFetch(
        new TypeError('fetch failed'),
        json(200, { items: [] }),
        json(201, { tracking_id: 'ANDAFTERNET' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDAFTERNET',
      });
      expect(calls).toHaveLength(3);
    });

    it('Given a lookup that lists another reference, when delivered, then it is not taken as ours', async () => {
      const { fetchFn } = scriptedFetch(
        json(500, {}),
        json(200, {
          items: [{ tracking_id: 'ANDOTHER', external_ref: 'R-1' }],
        }),
        json(201, { tracking_id: 'ANDMINE' }),
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.DELIVERED,
        trackingId: 'ANDMINE',
      });
    });

    it('Given a reference with special characters, when looked up, then it is URL-encoded', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(500, {}),
        json(200, { items: [] }),
        json(201, { tracking_id: 'ANDX' }),
      );
      await client(fetchFn).deliver({ ...request, external_ref: 'R 1/&2' });
      expect(calls[1].url).toBe(
        'http://carrier.test/v1/shipments?external_ref=R%201%2F%262',
      );
    });

    it('Given the carrier keeps failing, when delivered, then it gives up after 4 attempts as UNAVAILABLE with the last error', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(503, {}), // attempt 1: POST
        json(200, { items: [] }), // attempt 2: lookup, then
        json(500, {}), //             POST
        json(503, {}), // attempt 3: the lookup fails, so no blind re-POST
        json(200, { items: [] }), // attempt 4: lookup, then
        json(503, { error: 'still down' }), // POST
      );
      await expect(client(fetchFn).deliver(request)).resolves.toEqual({
        status: DeliveryStatus.UNAVAILABLE,
        detail: { status: 503 },
      });
      expect(routes(calls).filter((r) => r.startsWith('POST'))).toHaveLength(3);
      expect(calls).toHaveLength(6);
    });
  });

  describe('Scenario: provinces', () => {
    it('Given the API lists provinces, when asked, then they come back as they are spelled', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(200, { provinces: ['Buenos Aires', 'Tucumán'] }),
      );
      await expect(client(fetchFn).provinces()).resolves.toEqual([
        'Buenos Aires',
        'Tucumán',
      ]);
      expect(routes(calls)).toEqual(['GET /v1/provinces']);
    });

    it('Given a 503 then a list, when asked, then it is retried and succeeds', async () => {
      const { fetchFn } = scriptedFetch(
        json(503, {}),
        json(200, { provinces: ['Córdoba'] }),
      );
      await expect(client(fetchFn).provinces()).resolves.toEqual(['Córdoba']);
    });

    it('Given a 401, when asked, then it throws UNAUTHORIZED without retrying', async () => {
      const { fetchFn, calls } = scriptedFetch(json(401, {}));
      await expect(client(fetchFn).provinces()).rejects.toMatchObject({
        kind: DeliveryStatus.UNAUTHORIZED,
      });
      expect(calls).toHaveLength(1);
    });

    it('Given the API keeps failing, when asked, then it throws UNAVAILABLE after 4 attempts', async () => {
      const { fetchFn, calls } = scriptedFetch(
        json(500, {}),
        json(500, {}),
        json(500, {}),
        json(500, {}),
      );
      const error = await client(fetchFn)
        .provinces()
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CarrierRequestError);
      expect(error).toMatchObject({ kind: DeliveryStatus.UNAVAILABLE });
      expect(calls).toHaveLength(4);
    });
  });
});
