import { IsUUID } from 'class-validator';

/** Route params of `GET /delivery-notes/:id`. */
export class DeliveryNotesExportIdRequestDto {
  @IsUUID('4')
  id: string;
}
