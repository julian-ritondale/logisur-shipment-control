import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { DetailLink } from '@/components/detail-link'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { usePagedQuery } from '@/lib/use-paged-query'

export function ExportsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const exports = usePagedQuery(['exports'], (after) => api.listExports(after))

  const upload = useMutation({
    mutationFn: api.uploadExport,
    onSuccess: (created) => {
      toast.success(`Exportación cargada: ${created.deliveryNoteCount} remitos`)
      void queryClient.invalidateQueries({ queryKey: ['exports'] })
      void navigate(`/exports/${created.id}`)
    },
    onError: (error) => toast.error(error.message),
  })

  const rows = exports.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        carrierScoped={false}
        title="Exportaciones"
        description="Archivos diarios de remitos exportados desde el sistema de LogiSur."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Archivo de exportación de remitos"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) upload.mutate(file)
                event.target.value = ''
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Spinner /> : <Upload />}
              Subir exportación
            </Button>
          </>
        }
      />

      {exports.isPending ? (
        <ListSkeleton />
      ) : exports.isError ? (
        <ErrorAlert title="No se pudieron cargar las exportaciones" error={exports.error} />
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin exportaciones</EmptyTitle>
            <EmptyDescription>Suba un archivo JSON de remitos para comenzar.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Table className="min-w-[40rem] table-fixed">
            <colgroup>
              <col className="w-56" />
              <col className="w-28" />
              <col />
              <col className="w-28" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de carga</TableHead>
                <TableHead className="text-right">Remitos</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">{formatDateTime(row.uploadedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.deliveryNoteCount}</TableCell>
                  <TableCell className="truncate font-mono text-xs text-muted-foreground">{row.id}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <DetailLink to={`/exports/${row.id}`}>Abrir</DetailLink>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager paging={exports} />
        </>
      )}
    </div>
  )
}
