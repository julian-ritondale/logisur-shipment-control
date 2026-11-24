import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { EnvConfig } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Runs onModuleDestroy on SIGTERM, which closes the database pool.
  app.enableShutdownHooks();
  const config = app.get<EnvConfig>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
