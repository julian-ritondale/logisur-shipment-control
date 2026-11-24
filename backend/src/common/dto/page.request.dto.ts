import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Longest `nro_remito` accepted as a filter. */
export const MAX_NUMBER_LENGTH = 100;

/**
 * Cursor paging: `?after=<last id seen>&limit=20`. Listing schemas extend it
 * with their filters, and stay `strict`: an unknown query parameter is a 400.
 */
export const PAGE_REQUEST_SCHEMA = z.strictObject({
  after: z.uuidv4().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type PageRequestDto = z.infer<typeof PAGE_REQUEST_SCHEMA>;

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
