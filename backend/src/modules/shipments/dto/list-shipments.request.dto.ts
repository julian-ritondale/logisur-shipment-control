import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import { ShipmentStatus } from '../../../generated/prisma/client.js';
import {
  DELIVERABLE_CARRIERS,
  type Carrier,
} from '../../carriers/carrier-registry.js';
import { ReasonCode } from '../../delivery-notes/pipeline/reasons.js';
import {
  STEPS,
  type Step,
} from '../../delivery-notes/pipeline/types/pipeline.types.js';

const MAX_NUMBER_LENGTH = 100;

export class ListShipmentsRequestDto extends PageRequestDto {
  @IsOptional()
  @IsIn(Object.values(ShipmentStatus))
  status?: ShipmentStatus;

  @IsOptional()
  @IsIn(DELIVERABLE_CARRIERS)
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
  @IsIn(Object.values(ReasonCode))
  reasonCode?: ReasonCode;
}
