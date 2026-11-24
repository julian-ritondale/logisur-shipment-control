import { execSync } from 'node:child_process';

/** Recreates the e2e database from the schema once, before any test file. No migrations until the schema settles. */
export default function setup(): void {
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://logisur:logisur@localhost:5432/logisur_test',
    },
  });
}
