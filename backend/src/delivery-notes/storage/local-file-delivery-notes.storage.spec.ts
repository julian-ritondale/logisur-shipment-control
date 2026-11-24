import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFileDeliveryNotesStorage } from './local-file-delivery-notes.storage.js';

describe('LocalFileDeliveryNotesStorage', () => {
  let root: string;
  let dir: string;
  let storage: LocalFileDeliveryNotesStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'delivery-notes-storage-'));
    dir = join(root, 'uploads');
    storage = new LocalFileDeliveryNotesStorage(dir);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  describe('Scenario: saving an export', () => {
    it('Given a storage directory that does not exist yet, when an export is saved, then the directory is created and holds one <id>.json file', async () => {
      const id = await storage.save(Buffer.from('[]'));
      await expect(readdir(dir)).resolves.toEqual([`${id}.json`]);
    });

    it('Given an export, when it is saved, then its id is a v4 UUID', async () => {
      await expect(storage.save(Buffer.from('[]'))).resolves.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('Given some bytes, including a BOM and accents, when they are saved and read back, then exactly the same bytes are returned', async () => {
      const content = Buffer.from('\uFEFF[{"provincia": "Córdoba"}]\r\n');
      const id = await storage.save(content);
      await expect(storage.read(id)).resolves.toEqual(content);
    });

    it('Given the same content saved twice, when it is stored, then each save gets its own id', async () => {
      const first = await storage.save(Buffer.from('[]'));
      const second = await storage.save(Buffer.from('[]'));
      expect(first).not.toBe(second);
    });
  });

  describe('Scenario: reading an export that is not there', () => {
    it('Given an unknown id, when it is read, then null is returned', async () => {
      await expect(storage.read(randomUUID())).resolves.toBeNull();
    });

    it('Given an id that names a directory, when it is read, then null is returned', async () => {
      const id = randomUUID();
      await mkdir(join(dir, `${id}.json`), { recursive: true });
      await expect(storage.read(id)).resolves.toBeNull();
    });
  });

  describe('Scenario: only UUIDs are ids, so no id can name another file', () => {
    beforeEach(async () => {
      await mkdir(dir, { recursive: true });
      await writeFile(join(root, 'secret.json'), '[]');
      await writeFile(join(dir, 'not-a-uuid.json'), '[]');
      await mkdir(join(dir, 'nested'));
      await writeFile(join(dir, 'nested', 'inner.json'), '[]');
    });

    it.each([
      ['../secret.json', 'parent directory'],
      ['..\\secret.json', 'parent directory with a backslash'],
      ['nested/inner.json', 'a sub-path'],
      ['..', 'the parent itself'],
      ['.', 'the directory itself'],
      ['', 'an empty id'],
      ['not-a-uuid', 'a file in the directory not named by a UUID'],
      ['not-a-uuid.json', 'a full file name'],
    ])(
      'Given the id %j (%s), when it is read, then null is returned',
      async (id, _case) => {
        await expect(storage.read(id)).resolves.toBeNull();
      },
    );

    it('Given an absolute path as id, when it is read, then null is returned', async () => {
      await expect(storage.read(join(root, 'secret.json'))).resolves.toBeNull();
    });
  });
});
