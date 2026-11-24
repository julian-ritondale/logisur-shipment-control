import { Module } from '@nestjs/common';
import { DELIVERY_NOTES_READER } from './delivery-notes.reader.js';
import { JsonDeliveryNotesReader } from './json-delivery-notes.reader.js';

/** Provides `DELIVERY_NOTES_READER` for JSON exports. */
@Module({
  providers: [
    { provide: DELIVERY_NOTES_READER, useClass: JsonDeliveryNotesReader },
  ],
  exports: [DELIVERY_NOTES_READER],
})
export class JsonDeliveryNotesReaderModule {}
