import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { RunsTable } from '@/components/runs-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { CARRIER } from '@/lib/carrier'
import { formatDateTime } from '@/lib/format'
import { usePagedQuery } from '@/lib/use-paged-query'

export function ExportDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const exportQuery = useQuery({ queryKey: ['exports', id], queryFn: () => api.getExport(id) })
  const runs = usePagedQuery(['runs', { exportId: id }], (after) =>
    api.listRuns({ exportId: id }, after),
  )

  const start = useMutation({
    mutationFn: () => api.startRun(id),
    onSuccess: (run) => {
      toast.success('Corrida finalizada')
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
      void navigate(`/runs/${run.id}`)
    },
    onError: (error) => toast.error(error.message),
  })

  if (exportQuery.isPending) return <Skeleton className="h-32 w-full" />
  if (exportQuery.isError) {
    return <ErrorAlert title="No se pudo cargar la exportación" error={exportQuery.error} />
  }

  const uploaded = formatDateTime(exportQuery.data.uploadedAt)
  const runRows = runs.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        carrierScoped={false}
        back="/exports"
        crumbs={[{ label: 'Exportaciones', to: '/exports' }, { label: uploaded }]}
        title={`Exportación del ${uploaded}`}
        description={`Al procesarla se cargan en ${CARRIER.name} los remitos asignados a ese transportista. El resto se registra como omitido.`}
        actions={
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            {start.isPending ? <Spinner /> : <Play />}
            {start.isPending ? 'Procesando...' : `Procesar para ${CARRIER.name}`}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardDescription>Remitos en esta exportación (todos los transportistas)</CardDescription>
          <CardTitle className="text-3xl">{exportQuery.data.deliveryNoteCount}</CardTitle>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Corridas de esta exportación</h2>
        {runs.isPending ? (
          <ListSkeleton />
        ) : runs.isError ? (
          <ErrorAlert title="No se pudieron cargar las corridas" error={runs.error} />
        ) : runRows.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Esta exportación no tiene corridas registradas.
            </CardContent>
          </Card>
        ) : (
          <>
            <RunsTable runs={runRows} />
            <Pager paging={runs} />
          </>
        )}
      </section>
    </div>
  )
}
