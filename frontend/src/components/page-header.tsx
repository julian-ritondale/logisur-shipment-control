import { ArrowLeft } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import type { BackState } from '@/components/detail-link'
import { Button } from '@/components/ui/button'
import { CARRIER } from '@/lib/carrier'

export interface Crumb {
  label: ReactNode
  to?: string
}

/**
 * Title (prefixed with the carrier being tracked: "Expreso Andino / Envíos"), breadcrumb,
 * one-line explanation and the page's actions. `back` adds an "Atrás" button: it returns to
 * the page the detail was opened from (see `DetailLink`), or else to `back`, the parent list.
 */
export function PageHeader({
  title,
  description,
  crumbs = [],
  carrierScoped = true,
  back,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  /** Exports hold every carrier's remitos, so their pages don't start with the carrier. */
  carrierScoped?: boolean
  back?: string
  actions?: ReactNode
}) {
  return (
    <div className="space-y-3">
      {back && <BackButton fallback={back} />}
      <div className="space-y-1">
        {crumbs.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <Fragment key={index}>
                {index > 0 && ' / '}
                {crumb.to ? (
                  <Link to={crumb.to} className="underline-offset-4 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  crumb.label
                )}
              </Fragment>
            ))}
          </p>
        )}
        {/* Actions share the title's row and are centred on it. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold">
            {carrierScoped && (
              <span className="flex items-center gap-3">
                <span className="text-brand-indigo">{CARRIER.name}</span>
                <span className="font-normal text-muted-foreground">/</span>
              </span>
            )}
            {title}
          </h1>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}

function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate()
  const from = (useLocation().state as BackState | null)?.from
  return (
    <Button variant="ghost" size="sm" className="-ml-2" onClick={() => void navigate(from ?? fallback)}>
      <ArrowLeft />
      Atrás
    </Button>
  )
}
