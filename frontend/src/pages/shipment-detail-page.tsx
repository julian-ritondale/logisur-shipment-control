import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { AttemptsTimeline } from '@/components/attempts-timeline'
import { PageHeader } from '@/components/page-header'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { CopyButton } from '@/components/remito-number'
import {
  CarrierStatusBadge,
  LateBadge,
  ServiceBadge,
  ShipmentStatusBadge,
} from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { api, type ShipmentDetail } from '@/lib/api'
import { formatDateTime, formatDay, formatField, formatMoney, formatNumber } from '@/lib/format'
import { STEP } from '@/lib/labels'
import { attentionReason } from '@/lib/shipments'

export function ShipmentDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const shipment = useQuery({ queryKey: ['shipments', id], queryFn: () => api.getShipment(id) })
  const history = useQuery({
    queryKey: ['attempts', { shipmentId: id }],
    queryFn: () => api.listAttempts({ shipmentId: id, limit: 100 }),
  })

  const retry = useMutation({
    mutationFn: () => api.retryShipment(id),
    onSuccess: (run) => {
      if (run.totals.loaded > 0) toast.success('Cargado en el transportista')
      else toast.warning('Reintento finalizado: el envío no pudo cargarse')
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
      void queryClient.invalidateQueries({ queryKey: ['attempts'] })
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
      void navigate(`/runs/${run.id}`)
    },
    onError: (error) => toast.error(error.message),
  })

  if (shipment.isPending) return <Skeleton className="h-40 w-full" />
  if (shipment.isError) {
    return <ErrorAlert title="No se pudo cargar el envío" error={shipment.error} />
  }

  const data = shipment.data
  const problem = attentionReason(data)
  const failed = data.status === 'FAILED'

  return (
    <div className="space-y-6">
      <PageHeader
        back="/shipments"
        crumbs={[{ label: 'Envíos', to: '/shipments' }, { label: data.deliveryNoteNumber }]}
        title={
          <>
            Remito <span className="font-mono">{data.deliveryNoteNumber}</span>
            <CopyButton value={data.deliveryNoteNumber} />
            <ShipmentStatusBadge status={data.status} />
            {data.late && <LateBadge />}
          </>
        }
        description={`Registrado el ${formatDateTime(data.createdAt)}`}
        actions={
          failed && (
            <Button onClick={() => retry.mutate()} disabled={retry.isPending}>
              {retry.isPending ? <Spinner /> : <RotateCcw />}
              Reintentar
            </Button>
          )
        }
      />

      {problem && (
        <Alert variant={failed ? 'destructive' : 'default'}>
          <AlertTitle>{failed ? 'Envío no cargado' : 'Requiere atención'}</AlertTitle>
          <AlertDescription>
            {problem}
            {failed && data.failedStep && ` (en ${STEP[data.failedStep]}).`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <TrackingCard shipment={data} />
        <RecipientCard shipment={data} />
        <PackageCard shipment={data} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Historial</h2>
          <p className="text-sm text-muted-foreground">Corridas en las que se procesó este remito.</p>
        </div>
        {history.isPending ? (
          <ListSkeleton />
        ) : history.isError ? (
          <ErrorAlert title="No se pudo cargar el historial" error={history.error} />
        ) : (
          <AttemptsTimeline attempts={history.data.items} />
        )}
      </section>

      {data.payload && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer font-medium">Lo que se envió a {data.carrierName}</summary>
          <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(data.payload, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}

function Facts({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">{children}</dl>
      </CardContent>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

function TrackingCard({ shipment }: { shipment: ShipmentDetail }) {
  return (
    <Facts title="Seguimiento">
      <Fact label="Transportista">{shipment.carrierName}</Fact>
      <Fact label="Tracking">
        <span className="font-mono text-xs">{shipment.trackingId ?? '-'}</span>
      </Fact>
      <Fact label="Cargado">{shipment.loadedAt ? formatDateTime(shipment.loadedAt) : '-'}</Fact>
      <Fact label="Estado">
        {shipment.status === 'LOADED' ? <CarrierStatusBadge status={shipment.carrierStatus} /> : '-'}
      </Fact>
      <Fact label="Entrega estimada">
        {shipment.estimatedDelivery ? formatDay(shipment.estimatedDelivery) : '-'}
      </Fact>
      <Fact label="Última actualización">
        {shipment.statusCheckedAt ? formatDateTime(shipment.statusCheckedAt) : 'Nunca'}
      </Fact>
    </Facts>
  )
}

function RecipientCard({ shipment }: { shipment: ShipmentDetail }) {
  const recipient = shipment.normalized?.recipient
  return (
    <Facts title="Destinatario">
      <Fact label="Razón social">{formatField(recipient?.name)}</Fact>
      <Fact label="Dirección">{formatField(recipient?.street)}</Fact>
      <Fact label="Localidad">{formatField(recipient?.city)}</Fact>
      <Fact label="Provincia">{formatField(recipient?.province)}</Fact>
      <Fact label="Código postal">{formatField(recipient?.postalCode)}</Fact>
      <Fact label="Teléfono">{formatField(recipient?.phone)}</Fact>
    </Facts>
  )
}

function PackageCard({ shipment }: { shipment: ShipmentDetail }) {
  const note = shipment.normalized
  return (
    <Facts title="Carga">
      <Fact label="Servicio">
        {note?.service.status === 'VALID' ? (
          <ServiceBadge service={note.service.value} />
        ) : (
          formatField(note?.service)
        )}
      </Fact>
      <Fact label="Bultos">{formatField(note?.packages, formatNumber)}</Fact>
      <Fact label="Peso">{formatField(note?.weightKg, (kg) => `${formatNumber(kg)} kg`)}</Fact>
      <Fact label="Valor declarado">
        {note?.declaredValue.status === 'MISSING' ? '-' : formatField(note?.declaredValue, formatMoney)}
      </Fact>
    </Facts>
  )
}
