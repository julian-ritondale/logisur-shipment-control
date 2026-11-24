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
import type { ExportResponseDto } from './dto/export.response.dto.js';
import { ListExportsRequestDto } from './dto/list-exports.request.dto.js';
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
    @Query() query: ListExportsRequestDto,
  ): Promise<PageResponseDto<ExportResponseDto>> {
    return this.exports.list(query);
  }

  @Get(':id')
  findOne(@Param() { id }: IdRequestDto): Promise<ExportResponseDto> {
    return this.exports.get(id);
  }

  @Get(':id/content')
  @Header('Content-Type', 'application/json')
  async content(@Param() { id }: IdRequestDto): Promise<StreamableFile> {
    return new StreamableFile(await this.exports.content(id));
  }
}
