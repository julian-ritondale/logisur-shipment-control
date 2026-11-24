import { defineConfig } from 'vitest/config';

/**
 * E2E tests boot the whole app against a real PostgreSQL test database
 * (`docker compose up -d postgres` creates `logisur_test`). Override with
 * TEST_DATABASE_URL. Files run one at a time because they share it.
 */
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://logisur:logisur@localhost:5432/logisur_test';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL: databaseUrl,
      CARRIER: 'EXPRESO_ANDINO',
      // Never called: e2e tests replace the carrier integration with a fake.
      EXPRESO_API_URL: 'http://carrier.invalid',
      EXPRESO_API_KEY: 'test',
    },
  },
});
