// Prisma CLI configuration (migrate, generate, studio). The app itself reads
// DATABASE_URL through @nestjs/config; see src/prisma/prisma.service.ts.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Optional so `prisma generate` works without a database (Docker build,
    // CI). Commands that need one (migrate, studio) fail clearly without it.
    url: process.env.DATABASE_URL,
  },
});
