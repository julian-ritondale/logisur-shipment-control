import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { IdRequestDto } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import { DeliveryNotesService } from './delivery-notes.service.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
import { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
import {
  ExportUpload,
  UploadedExport,
  type UploadedExportFile,
} from './export-upload.decorator.js';

@Controller('exports')
export class ExportsController {
  constructor(private readonly deliveryNotes: DeliveryNotesService) {}

  @Post()
  @ExportUpload()
  upload(
    @UploadedExport() file: UploadedExportFile,
  ): Promise<ExportResponseDto> {
    return this.deliveryNotes.upload(file.buffer);
  }

  @Get()
  list(
    @Query() query: ListExportsRequestDto,
  ): Promise<PageResponseDto<ExportResponseDto>> {
    return this.deliveryNotes.listExports(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<ExportResponseDto> {
    return this.deliveryNotes.getExport(id);
  }

  @Get(':id/content')
  @Header('Content-Type', 'application/json')
  async content(@Param() { id }: IdRequestDto): Promise<StreamableFile> {
    return new StreamableFile(await this.deliveryNotes.exportContent(id));
  }
}
