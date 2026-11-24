import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';

export class ListExportsRequestDto extends PageRequestDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  uploadedFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  uploadedTo?: Date;
}
