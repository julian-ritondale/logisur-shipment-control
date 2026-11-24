import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApplicationErrorFilter } from './common/filters/application-error.filter.js';
import { ENVIRONMENT_SCHEMA } from './config/env.schema.js';
import { AttemptsModule } from './modules/attempts/attempts.module.js';
import { DeliveryNotesModule } from './modules/delivery-notes/delivery-notes.module.js';
import { ExportsModule } from './modules/exports/exports.module.js';
import { RunsModule } from './modules/runs/runs.module.js';
import { ShipmentsModule } from './modules/shipments/shipments.module.js';

@Module({
  imports: [
    // Loads .env (if present) and fails startup on a missing or invalid variable.
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: ENVIRONMENT_SCHEMA,
    }),
    ExportsModule,
    DeliveryNotesModule,
    RunsModule,
    AttemptsModule,
    ShipmentsModule,
  ],
  providers: [
    // Registered as providers (not in main.ts) so tests that boot AppModule get them too.
    { provide: APP_FILTER, useClass: ApplicationErrorFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
