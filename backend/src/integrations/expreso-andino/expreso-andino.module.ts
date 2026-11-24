import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema.js';
import { CARRIER_CLIENT } from '../../modules/carriers/carrier-client.js';
import { ExpresoAndinoClient } from './expreso-andino.client.js';

/** Expreso Andino, the carrier this deployment delivers to (`CARRIER`). */
@Module({
  providers: [
    {
      provide: ExpresoAndinoClient,
      inject: [ConfigService],
      useFactory: (config: EnvConfig) =>
        new ExpresoAndinoClient({
          baseUrl: config.get('EXPRESO_API_URL', { infer: true }),
          apiKey: config.get('EXPRESO_API_KEY', { infer: true }),
        }),
    },
    { provide: CARRIER_CLIENT, useExisting: ExpresoAndinoClient },
  ],
  exports: [CARRIER_CLIENT],
})
export class ExpresoAndinoModule {}
