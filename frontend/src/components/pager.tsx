import type { MouseEvent } from 'react'

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import type { PagedQuery } from '@/lib/use-paged-query'
import { cn } from '@/lib/utils'

/** Anterior, the pages reached so far, Siguiente. Hidden when everything fits in one page. */
export function Pager({ paging }: { paging: PagedQuery }) {
  const { page, pageCount, hasNext, goTo } = paging
  if (pageCount <= 1) return null

  const go = (target: number) => (event: MouseEvent) => {
    event.preventDefault()
    goTo(target)
  }
  const disabled = 'pointer-events-none opacity-50'

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Anterior"
            aria-label="Página anterior"
            aria-disabled={page === 0}
            className={cn(page === 0 && disabled)}
            onClick={go(page - 1)}
          />
        </PaginationItem>
        {Array.from({ length: pageCount }, (_, index) => (
          <PaginationItem key={index}>
            <PaginationLink
              href="#"
              isActive={index === page}
              aria-label={`Página ${index + 1}`}
              onClick={go(index)}
            >
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Siguiente"
            aria-label="Página siguiente"
            aria-disabled={!hasNext}
            className={cn(!hasNext && disabled)}
            onClick={go(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
