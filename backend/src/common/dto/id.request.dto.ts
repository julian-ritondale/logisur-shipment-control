import { IsUUID } from 'class-validator';

export class IdRequestDto {
  @IsUUID('4')
  id: string;
}
