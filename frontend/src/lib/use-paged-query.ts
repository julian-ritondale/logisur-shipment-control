import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { Page } from '@/lib/api'

interface Cursors {
  /** The query this paging belongs to; a new one starts again at page 1. */
  key: string
  page: number
  /** `after` for each page reached so far; page 1 has none. */
  cursors: (string | undefined)[]
}

/**
 * Numbered pages over the backend's cursor paging (`after`/`nextCursor`). The backend gives no
 * total, so the pages known are the ones visited plus the next one; TanStack Query's
 * `useInfiniteQuery` is built for "load more", not for showing one page at a time.
 */
export function usePagedQuery<T>(
  queryKey: readonly unknown[],
  fetchPage: (after?: string) => Promise<Page<T>>,
) {
  const key = JSON.stringify(queryKey)
  const [state, setState] = useState<Cursors>({ key, page: 0, cursors: [undefined] })
  const current: Cursors = state.key === key ? state : { key, page: 0, cursors: [undefined] }

  const after = current.cursors[current.page]
  const query = useQuery({
    queryKey: [...queryKey, { after }],
    queryFn: () => fetchPage(after),
    placeholderData: keepPreviousData,
  })

  const nextCursor = query.isPlaceholderData ? undefined : query.data?.nextCursor
  const pageCount = Math.max(current.cursors.length, current.page + (nextCursor ? 2 : 1))

  const goTo = (page: number) => {
    const cursors = [...current.cursors]
    if (page === current.page + 1 && nextCursor) cursors[page] = nextCursor
    if (page < 0 || page >= cursors.length) return
    setState({ key, page, cursors })
  }

  return { ...query, page: current.page, pageCount, hasNext: nextCursor !== undefined, goTo }
}

export type PagedQuery = Pick<
  ReturnType<typeof usePagedQuery>,
  'page' | 'pageCount' | 'hasNext' | 'goTo' | 'isPlaceholderData'
>
