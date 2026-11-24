import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DetailLink } from '@/components/detail-link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COPIED_FOR_MS = 1500

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn('text-muted-foreground hover:text-foreground', className)}
      aria-label={`Copiar ${value}`}
      title="Copiar"
      onClick={(event) => {
        // Rows and titles can be links: copying must not navigate.
        event.preventDefault()
        event.stopPropagation()
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true)
            setTimeout(() => setCopied(false), COPIED_FOR_MS)
          },
          () => toast.error('No se pudo copiar al portapapeles'),
        )
      }}
    >
      {copied ? <Check className="text-green-700" /> : <Copy />}
    </Button>
  )
}

/** A remito number in monospace, linked when `to` is given, with a copy button beside it. */
export function RemitoNumber({
  number,
  to,
  className,
}: {
  number: string
  to?: string
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-xs', className)}>
      {to ? (
        <DetailLink
          to={to}
          className="font-medium text-brand-blue underline-offset-4 hover:underline"
        >
          {number}
        </DetailLink>
      ) : (
        <span>{number}</span>
      )}
      <CopyButton value={number} />
    </span>
  )
}
