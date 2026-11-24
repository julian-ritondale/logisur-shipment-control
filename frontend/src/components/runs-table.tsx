import { DetailLink } from '@/components/detail-link'
import { RunStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RunSummary } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { RUN_KIND } from '@/lib/labels'

/** Fixed column widths; counts are right-aligned under right-aligned headers. */
export function RunsTable({ runs }: { runs: RunSummary[] }) {
  return (
    <Table className="min-w-[48rem] table-fixed">
      <colgroup>
        <col />
        <col className="w-28" />
        <col className="w-36" />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-24" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha de inicio</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Cargados</TableHead>
          <TableHead className="text-right">Omitidos</TableHead>
          <TableHead className="text-right">Fallidos</TableHead>
          <TableHead className="text-right">Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="tabular-nums">{formatDateTime(run.startedAt)}</TableCell>
            <TableCell>{RUN_KIND[run.kind]}</TableCell>
            <TableCell>
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{run.totals.loaded}</TableCell>
            <TableCell className="text-right tabular-nums">{run.totals.skipped}</TableCell>
            <TableCell className="text-right tabular-nums">{run.totals.failed}</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <DetailLink to={`/runs/${run.id}`}>Ver</DetailLink>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
