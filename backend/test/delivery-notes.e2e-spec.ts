import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { resetDatabase } from './database.js';

const EXPORT = [
  { nro_remito: 'R-1', transportista: 'EXPRESO ANDINO', peso_kg: '145,1' },
  { nro_remito: 'R-2', transportista: 'Cruz del Norte', peso_kg: 12.5 },
  { nro_remito: '', transportista: 'OCA' },
];

describe('Exports and delivery notes (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const upload = (content: string) =>
    http()
      .post('/exports')
      .attach('file', Buffer.from(content), 'remitos.json');

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario: uploading an export', () => {
    it('Given a valid export, when it is POSTed to /exports, then it answers 201 with its id and how many delivery notes it has', async () => {
      const { body } = await upload(JSON.stringify(EXPORT)).expect(201);
      expect(body).toEqual({
        id: expect.any(String),
        uploadedAt: expect.any(String),
        deliveryNoteCount: 3,
      });
    });

    it('Given an uploaded export, when its content is fetched, then it is the file as uploaded', async () => {
      const content = JSON.stringify(EXPORT);
      const { body } = await upload(content).expect(201);
      const response = await http()
        .get(`/exports/${body.id}/content`)
        .expect(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.text).toBe(content);
    });

    it.each([
      [
        '{"nro_remito": "R-1"}',
        'The export must be a JSON array of delivery notes',
      ],
      ['[{"nro_remito": "R-1"},', 'The export is not valid JSON'],
    ])(
      'Given %j, when it is POSTed, then it answers 422 and nothing is stored',
      async (content, message) => {
        const { body } = await upload(content).expect(422);
        expect(body).toEqual({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message,
        });
        expect((await http().get('/exports').expect(200)).body.items).toEqual(
          [],
        );
      },
    );

    it('Given no file, when it is POSTed, then it answers 400', async () => {
      await http().post('/exports').field('other', 'value').expect(400);
    });
  });

  describe('Scenario: listing exports', () => {
    it('Given two exports, when listed one per page, then each comes exactly once and the last page has no cursor', async () => {
      const uploaded = [
        (await upload('[]').expect(201)).body,
        (await upload('[{}]').expect(201)).body,
      ];
      const page1 = (await http().get('/exports?limit=1').expect(200)).body;
      const page2 = (
        await http()
          .get(`/exports?limit=1&after=${page1.nextCursor}`)
          .expect(200)
      ).body;
      expect(page1.nextCursor).toBe(page1.items[0].id);
      expect(page2.nextCursor).toBeUndefined();
      expect([...page1.items, ...page2.items]).toEqual(
        expect.arrayContaining(uploaded),
      );
      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    });

    it('Given an export, when listed with uploadedFrom in the future, then it is not there', async () => {
      await upload('[]').expect(201);
      const { body } = await http()
        .get('/exports?uploadedFrom=2999-01-01')
        .expect(200);
      expect(body.items).toEqual([]);
    });
  });

  describe('Scenario: querying delivery notes', () => {
    it('Given an uploaded export, when its delivery notes are listed, then each comes back as exported, with its number and carrier', async () => {
      const { id } = (await upload(JSON.stringify(EXPORT)).expect(201)).body;
      const { body } = await http()
        .get(`/delivery-notes?exportId=${id}`)
        .expect(200);
      expect(body.items).toEqual([
        {
          id: expect.any(String),
          exportId: id,
          position: 0,
          number: 'R-1',
          carrier: 'EXPRESO_ANDINO',
          raw: EXPORT[0],
        },
        {
          id: expect.any(String),
          exportId: id,
          position: 1,
          number: 'R-2',
          carrier: 'CRUZ_DEL_NORTE',
          raw: EXPORT[1],
        },
        { id: expect.any(String), exportId: id, position: 2, raw: EXPORT[2] },
      ]);
    });

    it.each([
      ['number=R-2', ['R-2']],
      ['carrier=EXPRESO_ANDINO', ['R-1']],
    ])(
      'Given delivery notes, when filtered by %s, then only those come back',
      async (query, numbers) => {
        await upload(JSON.stringify(EXPORT)).expect(201);
        const { body } = await http()
          .get(`/delivery-notes?${query}`)
          .expect(200);
        expect(
          body.items.map((note: { number: string }) => note.number),
        ).toEqual(numbers);
      },
    );

    it('Given a delivery note, when fetched by id, then it comes back', async () => {
      await upload(JSON.stringify(EXPORT)).expect(201);
      const [first] = (await http().get('/delivery-notes?limit=1').expect(200))
        .body.items;
      await http().get(`/delivery-notes/${first.id}`).expect(200).expect(first);
    });
  });

  describe('Scenario: what does not exist or is not valid', () => {
    it.each([
      [`/exports/${randomUUID()}`, 404],
      [`/exports/${randomUUID()}/content`, 404],
      [`/delivery-notes/${randomUUID()}`, 404],
      ['/exports/not-a-uuid', 400],
      ['/exports?uploadedFrom=yesterday', 400],
      ['/delivery-notes?carrier=OCA', 400],
      ['/delivery-notes?limit=101', 400],
    ])(
      'Given GET %s, when called, then it answers %i',
      async (path, status) => {
        await http().get(path).expect(status);
      },
    );
  });
});
