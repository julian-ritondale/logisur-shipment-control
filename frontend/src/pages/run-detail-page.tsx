import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { DetailLink } from '@/components/detail-link'
import { FilterButtons } from '@/components/filter-buttons'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { RemitoNumber } from '@/components/remito-number'
import { StatCard } from '@/components/stat-card'
import { OutcomeBadge, RunStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, type Attempt, type Outcome } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { causeLabel, RUN_KIND, STEP } from '@/lib/labels'
import { usePagedQuery } from '@/lib/use-paged-query'

const ALL = 'ALL'
const FILTERS: { value: Outcome | typeof ALL; label: string }[] = [
  { value: ALL, label: 'Todos' },
  { value: 'FAILED', label: 'Fallidos' },
  { value: 'LOADED', label: 'Cargados' },
  { value: 'SKIPPED', label: 'Omitidos' },
]

const LINK = 'text-brand-blue underline-offset-4 hover:underline'

export function RunDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [outcome, setOutcome] = useState<Outcome | typeof ALL>(ALL)

  const run = useQuery({ queryKey: ['runs', id], queryFn: () => api.getRun(id) })
  const attempts = usePagedQuery(['attempts', { runId: id, outcome }], (after) =>
    api.listAttempts({ runId: id, outcome: outcome === ALL ? undefined : outcome }, after),
  )

  const retry = useMutation({
    mutationFn: () => api.retryRun(id),
    onSuccess: (created) => {
      toast.success('Reintento finalizado')
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
      void navigate(`/runs/${created.id}`)
    },
    onError: (error) => toast.error(error.message),
  })

  if (run.isPending) return <Skeleton className="h-40 w-full" />
  if (run.isError) return <ErrorAlert title="No se pudo cargar la corrida" error={run.error} />

  const data = run.data
  const rows = attempts.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        back="/runs"
        crumbs={[{ label: 'Corridas', to: '/runs' }, { label: formatDateTime(data.startedAt) }]}
        title={
          <>
            Corrida {RUN_KIND[data.kind].toLowerCase()}
            <RunStatusBadge status={data.status} />
          </>
        }
        description={
          <>
            Inicio: {formatDateTime(data.startedAt)}
            {data.finishedAt && ` · Fin: ${formatDateTime(data.finishedAt)}`}
            {' · '}
            <DetailLink to={`/exports/${data.exportId}`} className={LINK}>
              Ver exportación
            </DetailLink>
            {data.parentRunId && (
              <>
                {' · '}
                <DetailLink to={`/runs/${data.parentRunId}`} className={LINK}>
                  Corrida original
                </DetailLink>
              </>
            )}
          </>
        }
        actions={
          data.totals.failed > 0 && (
            <Button variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
              {retry.isPending ? <Spinner /> : <RotateCcw />}
              Reintentar fallidos
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Remitos" value={data.totals.total} />
        <StatCard label="Cargados" value={data.totals.loaded} />
        <StatCard label="Omitidos" value={data.totals.skipped} />
        <StatCard label="Fallidos" value={data.totals.failed} tone="danger" />
      </div>

      {data.breakdown.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Resumen por motivo</h2>
          <Table className="min-w-[40rem] table-fixed">
            <colgroup>
              <col className="w-32" />
              <col className="w-48" />
              <col />
              <col className="w-28" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Resultado</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.breakdown.map((item) => (
                <TableRow key={`${item.outcome}-${item.step}-${item.cause ?? ''}`}>
                  <TableCell>
                    <OutcomeBadge outcome={item.outcome} />
                  </TableCell>
                  <TableCell>{STEP[item.step]}</TableCell>
                  <TableCell className="truncate">{item.cause ? causeLabel(item.cause) : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Detalle por remito</h2>
        <FilterButtons
          label="Filtrar por resultado"
          options={FILTERS}
          value={outcome}
          onChange={setOutcome}
        />

        {attempts.isPending ? (
          <ListSkeleton />
        ) : attempts.isError ? (
          <ErrorAlert title="No se pudieron cargar los remitos" error={attempts.error} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay remitos para el filtro seleccionado.</p>
        ) : (
          <>
            <Table className="min-w-[56rem] table-fixed">
              <colgroup>
                <col className="w-14" />
                <col className="w-44" />
                <col className="w-28" />
                <col className="w-48" />
                <col />
                <col className="w-44" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">N.º</TableHead>
                  <TableHead>Remito</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {attempt.position + 1}
                    </TableCell>
                    <TableCell>
                      <DeliveryNoteCell attempt={attempt} />
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={attempt.outcome} />
                    </TableCell>
                    <TableCell>{STEP[attempt.reachedStep]}</TableCell>
                    <TableCell className="truncate" title={reasonTooltip(attempt)}>
                      {attempt.cause ? causeLabel(attempt.cause) : '-'}
                      {attempt.issues && attempt.issues.length > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (+{attempt.issues.length - 1})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{attempt.trackingId ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager paging={attempts} />
          </>
        )}
      </section>
    </div>
  )
}

/** Links to its shipment if it became one; otherwise to everything known about the number. */
function DeliveryNoteCell({ attempt }: { attempt: Attempt }) {
  const number = attempt.deliveryNoteNumber
  if (!number) return <span className="text-muted-foreground">Sin número</span>
  const to = attempt.shipmentId
    ? `/shipments/${attempt.shipmentId}`
    : `/search?number=${encodeURIComponent(number)}`
  return <RemitoNumber number={number} to={to} />
}

/** Every problem found (when there were several), plus the backend's own message. */
function reasonTooltip(attempt: Attempt): string | undefined {
  const lines = (attempt.issues ?? []).map((issue) => causeLabel(issue.cause))
  if (attempt.reason) lines.push(attempt.reason)
  return lines.length > 0 ? lines.join('\n') : undefined
}
