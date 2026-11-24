import { Module } from '@nestjs/common';
import { EXPORTS_READER } from './exports.reader.js';
import { JsonExportsReader } from './json-exports.reader.js';

@Module({
  providers: [{ provide: EXPORTS_READER, useClass: JsonExportsReader }],
  exports: [EXPORTS_READER],
})
export class JsonExportsReaderModule {}
