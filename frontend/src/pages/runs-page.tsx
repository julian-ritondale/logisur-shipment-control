import { useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { RunsTable } from '@/components/runs-table'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, type RunStatus } from '@/lib/api'
import { RUN_STATUS } from '@/lib/labels'
import { usePagedQuery } from '@/lib/use-paged-query'

const ALL = 'ALL'

export function RunsPage() {
  const [status, setStatus] = useState<RunStatus | typeof ALL>(ALL)

  const runs = usePagedQuery(['runs', { status }], (after) =>
    api.listRuns({ status: status === ALL ? undefined : status }, after),
  )
  const rows = runs.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corridas"
        description="Historial de procesamientos de exportaciones y reintentos."
        actions={
          <Select value={status} onValueChange={(value) => setStatus(value as RunStatus | typeof ALL)}>
            <SelectTrigger className="w-52" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {Object.entries(RUN_STATUS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {runs.isPending ? (
        <ListSkeleton />
      ) : runs.isError ? (
        <ErrorAlert title="No se pudieron cargar las corridas" error={runs.error} />
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin corridas</EmptyTitle>
            <EmptyDescription>Las corridas se inician desde una exportación.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <RunsTable runs={rows} />
          <Pager paging={runs} />
        </>
      )}
    </div>
  )
}
