import {
  Controller,
  Get,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeliveryNotesService } from './delivery-notes.service.js';
import { DeliveryNotesExportIdRequestDto } from './dto/delivery-notes-export-id.request.dto.js';
import { DeliveryNotesExportResponseDto } from './dto/delivery-notes-export.response.dto.js';

const MAX_EXPORT_SIZE_BYTES = 5 * 1024 * 1024;

/** The part of multer's file object this controller uses. */
interface UploadedExportFile {
  buffer: Buffer;
}

@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  /** Uploads a remitos export as the multipart field `file`. */
  @Post()
  @UseInterceptors(
    // Over the limit: 413. Content is checked by the service: 422.
    FileInterceptor('file', {
      limits: { fileSize: MAX_EXPORT_SIZE_BYTES, files: 1 },
    }),
  )
  async upload(
    // No file: 400.
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: UploadedExportFile,
  ): Promise<DeliveryNotesExportResponseDto> {
    return new DeliveryNotesExportResponseDto(
      await this.deliveryNotesService.upload(file.buffer),
    );
  }

  @Get(':id')
  async findOne(
    @Param() { id }: DeliveryNotesExportIdRequestDto,
  ): Promise<DeliveryNotesExportResponseDto> {
    return new DeliveryNotesExportResponseDto(
      await this.deliveryNotesService.readExport(id),
    );
  }
}
