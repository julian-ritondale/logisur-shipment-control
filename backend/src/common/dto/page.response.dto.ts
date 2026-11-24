export class PageResponseDto<T> {
  items: T[];
  /** Pass as `after` to get the next page; absent on the last one. */
  nextCursor?: string;
}

/** Builds a page from `limit + 1` rows: the extra row only says there's more. */
export function toPage<Row extends { id: string }, T>(
  rows: Row[],
  limit: number,
  map: (row: Row) => T,
): PageResponseDto<T> {
  const items = rows.slice(0, limit);
  return {
    items: items.map(map),
    nextCursor: rows.length > limit ? items.at(-1)?.id : undefined,
  };
}

export const pageArgs = (after: string | undefined, limit: number) => ({
  take: limit + 1,
  ...(after && { cursor: { id: after }, skip: 1 }),
});
