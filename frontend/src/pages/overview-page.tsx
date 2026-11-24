import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router'

import { DetailLink } from '@/components/detail-link'
import { PageHeader } from '@/components/page-header'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { ShipmentsTable } from '@/components/shipments-table'
import { StatCard } from '@/components/stat-card'
import { RunStatusBadge } from '@/components/status-badge'
import { StatusCheckButton } from '@/components/status-check-button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type RunSummary, type Shipment } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { attentionReason } from '@/lib/shipments'

/** Most urgent first: not loaded at all, then carrier incidents, then late. */
const urgency = (shipment: Shipment) =>
  shipment.status === 'FAILED' ? 0 : shipment.carrierStatus === 'EXCEPTION' ? 1 : 2

export function OverviewPage() {
  const shipments = useQuery({ queryKey: ['shipments', 'all'], queryFn: () => api.allShipments() })
  const lastRun = useQuery({
    queryKey: ['runs', { limit: 1 }],
    queryFn: () => api.listRuns({ limit: 1 }),
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Control de envíos"
        description="Resumen operativo: remitos no cargados, envíos atrasados e incidencias informadas por el transportista."
        actions={<StatusCheckButton />}
      />

      {shipments.isPending ? (
        <ListSkeleton />
      ) : shipments.isError ? (
        <ErrorAlert title="No se pudieron cargar los envíos" error={shipments.error} />
      ) : (
        <ShipmentsOverview shipments={shipments.data.items} truncated={shipments.data.truncated} />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Última corrida</h2>
        {lastRun.isPending ? (
          <ListSkeleton />
        ) : lastRun.isError ? (
          <ErrorAlert title="No se pudieron cargar las corridas" error={lastRun.error} />
        ) : lastRun.data.items.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              No hay corridas registradas.{' '}
              <Link to="/exports" className="text-brand-blue underline underline-offset-4">
                Ir a Exportaciones
              </Link>
            </CardContent>
          </Card>
        ) : (
          <LastRunCard run={lastRun.data.items[0]} />
        )}
      </section>
    </div>
  )
}

function ShipmentsOverview({ shipments, truncated }: { shipments: Shipment[]; truncated: boolean }) {
  const loaded = shipments.filter((s) => s.status === 'LOADED')
  const attention = shipments
    .filter((s) => attentionReason(s) !== undefined)
    .sort((a, b) => urgency(a) - urgency(b))
  const lastCheck = loaded
    .map((s) => s.statusCheckedAt)
    .filter((at) => at !== undefined)
    .sort()
    .at(-1)

  return (
    <>
      {truncated && (
        <Alert>
          <AlertTitle>Totales parciales</AlertTitle>
          <AlertDescription>
            Los indicadores consideran los primeros 2.000 envíos. Consulte el listado completo en Envíos.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Cargados en el transportista"
          value={loaded.length}
          to="/shipments?view=loaded"
        />
        <StatCard
          label="Entregados al cliente"
          value={loaded.filter((s) => s.carrierStatus === 'DELIVERED').length}
          to="/shipments?view=delivered"
        />
        <StatCard
          label="No cargados"
          hint="Requieren corrección o reintento"
          value={shipments.filter((s) => s.status === 'FAILED').length}
          tone="danger"
          to="/shipments?view=failed"
        />
        <StatCard
          label="Atrasados"
          hint="Fecha estimada vencida"
          value={shipments.filter((s) => s.late).length}
          tone="warning"
          to="/shipments?view=late"
        />
        <StatCard
          label="Con incidencia"
          hint="Informadas por el transportista"
          value={loaded.filter((s) => s.carrierStatus === 'EXCEPTION').length}
          tone="warning"
          to="/shipments?view=exceptions"
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Requiere atención</h2>
          <p className="text-xs text-muted-foreground">
            {lastCheck
              ? `Última actualización: ${formatDateTime(lastCheck)}`
              : 'Estado sin actualizar'}
          </p>
        </div>
        {attention.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-brand-blue" />
              No hay envíos pendientes de atención.
            </CardContent>
          </Card>
        ) : (
          <ShipmentsTable shipments={attention} />
        )}
      </section>
    </>
  )
}

function LastRunCard({ run }: { run: RunSummary }) {
  return (
    <DetailLink to={`/runs/${run.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            {formatDateTime(run.startedAt)}
            <RunStatusBadge status={run.status} />
          </CardTitle>
          <CardDescription>
            {run.totals.total} remitos · {run.totals.loaded} cargados · {run.totals.skipped}{' '}
            omitidos · {run.totals.failed} fallidos
          </CardDescription>
        </CardHeader>
      </Card>
    </DetailLink>
  )
}
