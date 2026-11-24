import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ID_SCHEMA } from '../../common/dto/id.request.dto.js';
import type { PageResponseDto } from '../../common/dto/page.response.dto.js';
import type { ExportResponseDto } from './dto/export.response.dto.js';
import {
  LIST_EXPORTS_REQUEST_SCHEMA,
  type ListExportsRequestDto,
} from './dto/list-exports.request.dto.js';
import {
  ExportUpload,
  UploadedExport,
  type UploadedExportFile,
} from './exports-upload.decorator.js';
import { ExportsService } from './exports.service.js';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Post()
  @ExportUpload()
  upload(
    @UploadedExport() file: UploadedExportFile,
  ): Promise<ExportResponseDto> {
    return this.exports.upload(file.buffer);
  }

  @Get()
  list(
    @Query({ schema: LIST_EXPORTS_REQUEST_SCHEMA })
    query: ListExportsRequestDto,
  ): Promise<PageResponseDto<ExportResponseDto>> {
    return this.exports.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id', { schema: ID_SCHEMA }) id: string,
  ): Promise<ExportResponseDto> {
    return this.exports.get(id);
  }

  @Get(':id/content')
  @Header('Content-Type', 'application/json')
  async content(
    @Param('id', { schema: ID_SCHEMA }) id: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.exports.content(id));
  }
}
