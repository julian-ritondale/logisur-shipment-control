import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PageRequestDto } from '../../../common/dto/page.request.dto.js';
import { RunKind, RunStatus } from '../../../generated/prisma/client.js';
import { Carrier } from '../../carriers/carrier-registry.js';

export class ListRunsRequestDto extends PageRequestDto {
  @IsOptional()
  @IsIn(Object.values(RunStatus))
  status?: RunStatus;

  @IsOptional()
  @IsIn(Object.values(RunKind))
  kind?: RunKind;

  @IsOptional()
  @IsUUID('4')
  exportId?: string;

  @IsOptional()
  @IsIn(Object.values(Carrier))
  carrier?: Carrier;
}
