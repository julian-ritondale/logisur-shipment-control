import { Link } from 'react-router'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** A count with its label; links to the list behind it when `to` is given. */
export function StatCard({
  label,
  value,
  hint,
  to,
  tone,
}: {
  label: string
  value: number | string
  hint?: string
  to?: string
  tone?: 'danger' | 'warning'
}) {
  const card = (
    <Card className={cn('h-full', to && 'transition-colors hover:bg-muted/50')}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            'text-3xl tabular-nums',
            tone === 'danger' && value !== 0 && 'text-red-700',
            tone === 'warning' && value !== 0 && 'text-amber-600',
          )}
        >
          {value}
        </CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  )
  return to ? <Link to={to}>{card}</Link> : card
}
