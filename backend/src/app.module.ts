import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
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
    // Validates every parameter declared with `{ schema }` (Zod) and passes on the parsed value.
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
  ],
})
export class AppModule {}
