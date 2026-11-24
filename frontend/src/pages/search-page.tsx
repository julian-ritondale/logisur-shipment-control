import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router'

import { AttemptsTimeline } from '@/components/attempts-timeline'
import { DetailLink } from '@/components/detail-link'
import { PageHeader } from '@/components/page-header'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { CopyButton } from '@/components/remito-number'
import {
  CarrierStatusBadge,
  LateBadge,
  OutcomeBadge,
  ShipmentStatusBadge,
} from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, type Attempt, type DeliveryNote, type Shipment } from '@/lib/api'
import { formatDay } from '@/lib/format'
import { causeLabel } from '@/lib/labels'
import { attentionReason } from '@/lib/shipments'

/**
 * Everything known about one delivery note number: its shipment, what each run did with it and
 * the exports it came in. Works even when it never became a shipment (another carrier, a
 * duplicate, a missing number).
 */
export function SearchPage() {
  const [searchParams] = useSearchParams()
  const number = searchParams.get('number')?.trim() ?? ''
  // Searching starts from the header; without a number there is nothing to show.
  if (!number) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <PageHeader
        back="/"
        title="Resultado de búsqueda"
        description="Estado de carga, seguimiento e historial de procesamiento del remito."
      />
      <SearchResults number={number} />
    </div>
  )
}

function SearchResults({ number }: { number: string }) {
  const notes = useQuery({
    queryKey: ['delivery-notes', { number }],
    queryFn: () => api.listDeliveryNotes({ number, limit: 100 }),
  })
  const shipments = useQuery({
    queryKey: ['shipments', { deliveryNoteNumber: number }],
    queryFn: () => api.listShipments({ deliveryNoteNumber: number, limit: 100 }),
  })
  const attempts = useQuery({
    queryKey: ['attempts', { deliveryNoteNumber: number }],
    queryFn: () => api.listAttempts({ deliveryNoteNumber: number, limit: 100 }),
  })

  const error = [notes, shipments, attempts].find((q) => q.isError)?.error
  if (error) return <ErrorAlert title="No se pudo completar la consulta" error={error} />
  if (!notes.data || !shipments.data || !attempts.data) return <ListSkeleton />

  if (notes.data.items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Remito no encontrado</EmptyTitle>
          <EmptyDescription>
            El remito <span className="font-mono">{number}</span> no figura en ninguna
            exportación. Verifique el número, incluido el prefijo «R-».
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const history = [...attempts.data.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="space-y-6">
      <SummaryCard number={number} shipment={shipments.data.items[0]} latest={history[0]} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de procesamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <AttemptsTimeline attempts={history} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exportaciones de origen</CardTitle>
          </CardHeader>
          <CardContent>
            <SourcesTable notes={notes.data.items} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  number,
  shipment,
  latest,
}: {
  number: string
  shipment?: Shipment
  latest?: Attempt
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          Remito <span className="font-mono">{number}</span>
          <CopyButton value={number} />
          {shipment ? (
            <>
              <ShipmentStatusBadge status={shipment.status} />
              {shipment.late && <LateBadge />}
            </>
          ) : (
            latest && <OutcomeBadge outcome={latest.outcome} />
          )}
        </CardTitle>
        {shipment && (
          <Button asChild variant="outline" size="sm">
            <DetailLink to={`/shipments/${shipment.id}`}>
              Ver ficha del envío
              <ArrowRight />
            </DetailLink>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {shipment ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Transportista">{shipment.carrierName}</Fact>
            <Fact label="Estado en transportista">
              {shipment.status === 'LOADED' ? (
                <CarrierStatusBadge status={shipment.carrierStatus} />
              ) : (
                '-'
              )}
            </Fact>
            <Fact label="Entrega estimada">
              {shipment.estimatedDelivery ? formatDay(shipment.estimatedDelivery) : '-'}
            </Fact>
            <Fact label="Tracking">
              {shipment.trackingId ? (
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  {shipment.trackingId}
                  <CopyButton value={shipment.trackingId} />
                </span>
              ) : (
                '-'
              )}
            </Fact>
            {attentionReason(shipment) && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Fact label="Observaciones">{attentionReason(shipment)}</Fact>
              </div>
            )}
          </dl>
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Fact label="Envío">Sin envío asociado</Fact>
            <Fact label="Motivo">
              {latest?.cause ? causeLabel(latest.cause) : 'No fue procesado en ninguna corrida'}
            </Fact>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function SourcesTable({ notes }: { notes: DeliveryNote[] }) {
  return (
    <Table className="table-fixed">
      <colgroup>
        <col />
        <col className="w-20" />
        <col className="w-36" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Exportación</TableHead>
          <TableHead className="text-right">Línea</TableHead>
          <TableHead>Transportista</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
            <TableCell>
              <DetailLink
                to={`/exports/${note.exportId}`}
                className="font-mono text-xs text-brand-blue underline-offset-4 hover:underline"
              >
                {note.exportId.slice(0, 8)}
              </DetailLink>
            </TableCell>
            <TableCell className="text-right tabular-nums">{note.position + 1}</TableCell>
            <TableCell className="truncate">{String(note.raw.transportista ?? '-')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
