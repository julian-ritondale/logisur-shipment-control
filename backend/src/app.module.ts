import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApplicationErrorFilter } from './common/filters/application-error.filter.js';
import { DeliveryNotesModule } from './delivery-notes/delivery-notes.module.js';

@Module({
  imports: [DeliveryNotesModule],
  controllers: [AppController],
  providers: [
    AppService,
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
