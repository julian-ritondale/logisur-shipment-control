import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import { Carrier } from '../../carriers/carrier-registry.js';

const MAX_NUMBER_LENGTH = 100;

export class ListDeliveryNotesRequestDto extends PageRequestDto {
  @IsOptional()
  @IsUUID('4')
  exportId?: string;

  /** `nro_remito`. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMBER_LENGTH)
  number?: string;

  @IsOptional()
  @IsIn(Object.values(Carrier))
  carrier?: Carrier;
}
