import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import {
  Cause,
  OUTCOMES,
  type Outcome,
  STEPS,
  type Step,
} from '../../../common/types/pipeline.types.js';

const MAX_NUMBER_LENGTH = 100;

export class ListAttemptsRequestDto extends PageRequestDto {
  @IsOptional()
  @IsUUID('4')
  runId?: string;

  @IsOptional()
  @IsUUID('4')
  shipmentId?: string;

  @IsOptional()
  @IsIn(OUTCOMES)
  outcome?: Outcome;

  /** Where the attempt stopped. */
  @IsOptional()
  @IsIn(STEPS)
  step?: Step;

  @IsOptional()
  @IsIn(Object.values(Cause))
  cause?: Cause;

  /** `nro_remito`. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMBER_LENGTH)
  deliveryNoteNumber?: string;
}
