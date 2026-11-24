import { RemitoNumber } from '@/components/remito-number'
import { CarrierStatusBadge, LateBadge, ShipmentStatusBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Shipment } from '@/lib/api'
import { formatDay } from '@/lib/format'
import { attentionReason } from '@/lib/shipments'

const DASH = <span className="text-muted-foreground">-</span>

/** Fixed column widths, so the table lines up the same on every page and every view. */
export function ShipmentsTable({ shipments }: { shipments: Shipment[] }) {
  return (
    <Table className="min-w-[56rem] table-fixed">
      <colgroup>
        <col className="w-44" />
        <col className="w-32" />
        <col className="w-52" />
        <col className="w-36" />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Remito</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Estado en transportista</TableHead>
          <TableHead>Entrega estimada</TableHead>
          <TableHead>Observaciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow key={shipment.id}>
            <TableCell>
              <RemitoNumber number={shipment.deliveryNoteNumber} to={`/shipments/${shipment.id}`} />
            </TableCell>
            <TableCell>
              <ShipmentStatusBadge status={shipment.status} />
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-1">
                {shipment.status === 'LOADED' ? (
                  <CarrierStatusBadge status={shipment.carrierStatus} />
                ) : (
                  DASH
                )}
                {shipment.late && <LateBadge />}
              </span>
            </TableCell>
            <TableCell className="tabular-nums">
              {shipment.estimatedDelivery ? formatDay(shipment.estimatedDelivery) : DASH}
            </TableCell>
            <TableCell className="truncate" title={attentionReason(shipment)}>
              {attentionReason(shipment) ?? DASH}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
