import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpresoAndinoClient } from './expreso-andino-client.js';
import { ExpresoAndinoCarrier } from './expreso-andino.carrier.js';

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
    {
      provide: ExpresoAndinoCarrier,
      inject: [ExpresoAndinoClient],
      useFactory: (client: ExpresoAndinoClient) =>
        new ExpresoAndinoCarrier(client),
    },
  ],
  exports: [ExpresoAndinoCarrier],
})
export class ExpresoAndinoModule {}
