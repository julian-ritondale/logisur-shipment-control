import { IsUUID } from 'class-validator';

export class CreateRunRequestDto {
  /** The uploaded export to run (`POST /exports`). */
  @IsUUID('4')
  exportId: string;
}
