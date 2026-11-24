import {
  applyDecorators,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

const BYTES_PER_MEGABYTE = 1024 * 1024;
export const MAX_EXPORT_SIZE_BYTES = 5 * BYTES_PER_MEGABYTE;
const EXPORT_FIELD = 'file';

export interface UploadedExportFile {
  buffer: Buffer;
}

/** Reads an export sent as the multipart field `file`: over the limit is 413. */
export const ExportUpload = () =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor(EXPORT_FIELD, {
        limits: { fileSize: MAX_EXPORT_SIZE_BYTES, files: 1 },
      }),
    ),
  );

/** The uploaded export; missing is 400. */
export const UploadedExport = () =>
  UploadedFile(new ParseFilePipe({ fileIsRequired: true }));
