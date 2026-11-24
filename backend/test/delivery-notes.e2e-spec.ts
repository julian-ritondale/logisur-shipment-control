import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DELIVERY_NOTES_STORAGE } from './../src/delivery-notes/storage/delivery-notes.storage.js';
import { LocalFileDeliveryNotesStorage } from './../src/delivery-notes/storage/local-file-delivery-notes.storage.js';

const EXPORT = JSON.stringify([
  { nro_remito: 'R-1', transportista: 'EXPRESO ANDINO', peso_kg: '145,1' },
  { nro_remito: 'R-2', transportista: 'Cruz del Norte', peso_kg: 12.5 },
]);

describe('Delivery notes (e2e)', () => {
  let app: INestApplication<App>;
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'delivery-notes-e2e-'));
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DELIVERY_NOTES_STORAGE)
      .useValue(new LocalFileDeliveryNotesStorage(dir))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  const upload = (content: string) =>
    request(app.getHttpServer())
      .post('/delivery-notes')
      .attach('file', Buffer.from(content), 'remitos_2026-09-30.json');

  describe('Scenario: uploading an export', () => {
    it('Given a valid export, when it is POSTed to /delivery-notes, then it answers 201 with the id and every record untouched (nothing filtered)', async () => {
      const response = await upload(EXPORT).expect(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        count: 2,
        deliveryNotes: JSON.parse(EXPORT),
      });
    });

    it('Given an uploaded export, when GET /delivery-notes/:id is called, then it answers 200 with the same records', async () => {
      const { body } = await upload(EXPORT).expect(201);
      await request(app.getHttpServer())
        .get(`/delivery-notes/${body.id}`)
        .expect(200)
        .expect({ id: body.id, count: 2, deliveryNotes: JSON.parse(EXPORT) });
    });
  });

  describe('Scenario: uploads that are rejected', () => {
    it('Given no file in the request, when it is POSTed, then it answers 400', async () => {
      await request(app.getHttpServer())
        .post('/delivery-notes')
        .field('other', 'value')
        .expect(400);
    });

    it('Given a file that is not a JSON array, when it is POSTed, then it answers 422 with Nest’s standard error body', async () => {
      const { body } = await upload('{"nro_remito": "R-1"}').expect(422);
      expect(body).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'The export must be a JSON array of delivery notes',
      });
    });

    it('Given a file over 5 MB, when it is POSTed, then it answers 413', async () => {
      await upload(`[${' '.repeat(5 * 1024 * 1024)}]`).expect(413);
    });
  });

  describe('Scenario: reading an export that does not exist or with an invalid id', () => {
    it('Given an id with no stored export, when GET /delivery-notes/:id is called, then it answers 404', async () => {
      const id = randomUUID();
      const { body } = await request(app.getHttpServer())
        .get(`/delivery-notes/${id}`)
        .expect(404);
      expect(body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: `Delivery notes export "${id}" not found`,
      });
    });

    it.each([
      ['does-not-exist.json', 'a file name'],
      ['..', 'parent directory'],
      ['%2E%2E%2Fsecret.json', 'encoded path traversal'],
      ['6f1c2f1e-8f1a-11ef-8c5b-0242ac120002', 'a UUID that is not v4'],
    ])(
      'Given the id %j (%s), when GET /delivery-notes/:id is called, then it answers 400 from request validation',
      async (id, _case) => {
        const { body } = await request(app.getHttpServer())
          .get(`/delivery-notes/${id}`)
          .expect(400);
        expect(body).toEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: ['id must be a UUID'],
        });
      },
    );
  });
});
