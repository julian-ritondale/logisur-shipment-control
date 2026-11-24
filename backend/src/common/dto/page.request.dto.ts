import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Cursor paging: `?after=<last id seen>&limit=20`. */
export class PageRequestDto {
  @IsOptional()
  @IsUUID('4')
  after?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}

/** A listing request split into its cursor and its filters, as repositories take it. */
export interface PageQuery<Filters> {
  filters: Filters;
  after?: string;
  limit: number;
}

export const fromPageRequestDto = <Dto extends PageRequestDto>({
  after,
  limit,
  ...filters
}: Dto): PageQuery<Omit<Dto, keyof PageRequestDto>> => ({
  filters,
  after,
  limit,
});
