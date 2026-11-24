import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import { ReasonCode } from '../../delivery-notes/pipeline/reasons.js';
import {
  OUTCOMES,
  STEPS,
  type Outcome,
  type Step,
} from '../../delivery-notes/pipeline/types/pipeline.types.js';

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
  @IsIn(Object.values(ReasonCode))
  reasonCode?: ReasonCode;

  /** `nro_remito`. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NUMBER_LENGTH)
  deliveryNoteNumber?: string;
}
