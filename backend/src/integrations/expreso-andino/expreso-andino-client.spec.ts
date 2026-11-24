import { ExpresoAndinoClient } from './expreso-andino-client.js';

const answer = (status: number, body: string) =>
  vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(new Response(body, { status })),
  );

const client = (fetchFn: ReturnType<typeof answer>) =>
  new ExpresoAndinoClient(
    { baseUrl: 'http://carrier.test//', apiKey: 'secret-key' },
    fetchFn,
  );

const sent = (fetchFn: ReturnType<typeof answer>) => {
  const [url, init] = fetchFn.mock.calls[0];
  return { url, init, headers: init.headers as Record<string, string> };
};

describe('ExpresoAndinoClient', () => {
  describe('Scenario: one method per endpoint of API.md', () => {
    it('Given listProvinces, when called, then it GETs /v1/provinces with the API key', async () => {
      const fetchFn = answer(200, '{"provinces":["Córdoba"]}');
      await expect(client(fetchFn).listProvinces()).resolves.toEqual({
        status: 200,
        ok: true,
        body: { provinces: ['Córdoba'] },
      });
      const { url, init, headers } = sent(fetchFn);
      expect(init.method).toBe('GET');
      expect(url).toBe('http://carrier.test/v1/provinces');
      expect(headers['X-Api-Key']).toBe('secret-key');
      expect(headers).not.toHaveProperty('Content-Type');
    });

    it('Given createShipment, when called, then it POSTs the body as JSON to /v1/shipments', async () => {
      const fetchFn = answer(201, '{"tracking_id":"AND1"}');
      await client(fetchFn).createShipment({ external_ref: 'R-1' });
      const { url, init, headers } = sent(fetchFn);
      expect(init.method).toBe('POST');
      expect(url).toBe('http://carrier.test/v1/shipments');
      expect(headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body as string)).toEqual({ external_ref: 'R-1' });
    });

    it('Given searchShipments, when called with special characters, then external_ref is percent-encoded', async () => {
      const fetchFn = answer(200, '{"items":[]}');
      await client(fetchFn).searchShipments('R 1/&2');
      expect(sent(fetchFn).url).toBe(
        'http://carrier.test/v1/shipments?external_ref=R%201%2F%262',
      );
    });

    it('Given getShipment, when called, then it GETs /v1/shipments/{tracking_id}', async () => {
      const fetchFn = answer(200, '{"status":"IN_TRANSIT"}');
      await client(fetchFn).getShipment('AND1A2B3C4D');
      expect(sent(fetchFn).url).toBe(
        'http://carrier.test/v1/shipments/AND1A2B3C4D',
      );
    });
  });

  describe('Scenario: answers are returned, not judged', () => {
    it('Given a 503 with a text body, when called, then it resolves with the status and the text', async () => {
      const fetchFn = answer(503, 'Service Unavailable');
      await expect(client(fetchFn).listProvinces()).resolves.toEqual({
        status: 503,
        ok: false,
        body: 'Service Unavailable',
      });
    });

    it('Given a network error, when called, then it rejects with it', async () => {
      const fetchFn = vi.fn(() =>
        Promise.reject(new TypeError('fetch failed')),
      );
      await expect(
        new ExpresoAndinoClient(
          { baseUrl: 'http://carrier.test', apiKey: 'k' },
          fetchFn,
        ).listProvinces(),
      ).rejects.toThrow('fetch failed');
    });
  });
});
