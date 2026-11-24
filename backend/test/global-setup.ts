import { execSync } from 'node:child_process';

/** Brings the e2e database schema up to date once, before any test file. */
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://logisur:logisur@localhost:5432/logisur_test',
    },
  });
}
