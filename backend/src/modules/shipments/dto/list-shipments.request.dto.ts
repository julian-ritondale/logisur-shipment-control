import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import {
  CarrierStatus,
  ShipmentStatus,
} from '../../../generated/prisma/client.js';
import { Carrier } from '../../carriers/carrier-registry.js';
import {
  Cause,
  STEPS,
  type Step,
} from '../../../common/types/pipeline.types.js';

const MAX_NUMBER_LENGTH = 100;

/** Query strings are text: only these two spellings are booleans. */
const QUERY_BOOLEANS: Record<string, boolean> = { true: true, false: false };

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

  /** The carrier's tracking status, e.g. `EXCEPTION`. */
  @IsOptional()
  @IsIn(Object.values(CarrierStatus))
  carrierStatus?: CarrierStatus;

  /** `true`: past its estimated delivery and not delivered to the customer. */
  @IsOptional()
  @Transform(({ value }) => QUERY_BOOLEANS[value as string] ?? value)
  @IsBoolean()
  late?: boolean;
}
