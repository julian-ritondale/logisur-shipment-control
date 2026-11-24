import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import { ShipmentStatus } from '../../../generated/prisma/client.js';
import { Carrier } from '../../carriers/carrier-registry.js';
import {
  Cause,
  STEPS,
  type Step,
} from '../../../common/types/pipeline.types.js';

const MAX_NUMBER_LENGTH = 100;

export class ListShipmentsRequestDto extends PageRequestDto {
  @IsOptional()
  @IsIn(Object.values(ShipmentStatus))
  status?: ShipmentStatus;

  @IsOptional()
  @IsIn(Object.values(Carrier))
  carrier?: Carrier;

  /** `nro_remito`. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMBER_LENGTH)
  deliveryNoteNumber?: string;

  @IsOptional()
  @IsIn(STEPS)
  failedStep?: Step;

  @IsOptional()
  @IsIn(Object.values(Cause))
  cause?: Cause;
}
