import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpresoAndinoClient } from './expreso-andino.client.js';

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
  ],
  exports: [ExpresoAndinoClient],
})
export class ExpresoAndinoModule {}
