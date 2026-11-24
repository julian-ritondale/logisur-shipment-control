import { Module } from '@nestjs/common';
import { resolve } from 'node:path';
import { DELIVERY_NOTES_STORAGE } from './delivery-notes.storage.js';
import { LocalFileDeliveryNotesStorage } from './local-file-delivery-notes.storage.js';

/** Provides `DELIVERY_NOTES_STORAGE` as files in `DELIVERY_NOTES_DIR` (default `./uploads`). */
@Module({
  providers: [
    {
      provide: DELIVERY_NOTES_STORAGE,
      useFactory: () =>
        new LocalFileDeliveryNotesStorage(
          resolve(process.env.DELIVERY_NOTES_DIR ?? 'uploads'),
        ),
    },
  ],
  exports: [DELIVERY_NOTES_STORAGE],
})
export class LocalFileDeliveryNotesStorageModule {}
