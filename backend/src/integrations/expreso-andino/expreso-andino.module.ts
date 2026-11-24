import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CARRIER_CLIENT } from '../../modules/carriers/carrier-client.js';
import { ExpresoAndinoClient } from './expreso-andino.client.js';

/** Expreso Andino, the carrier this deployment delivers to (`CARRIER`). */
@Module({
  providers: [
    {
      provide: ExpresoAndinoClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new ExpresoAndinoClient({
          baseUrl: config.getOrThrow<string>('EXPRESO_API_URL'),
          apiKey: config.getOrThrow<string>('EXPRESO_API_KEY'),
        }),
    },
    { provide: CARRIER_CLIENT, useExisting: ExpresoAndinoClient },
  ],
  exports: [CARRIER_CLIENT],
})
export class ExpresoAndinoModule {}
