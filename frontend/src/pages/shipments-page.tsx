import { useSearchParams } from 'react-router'

import { FilterButtons } from '@/components/filter-buttons'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ErrorAlert, ListSkeleton } from '@/components/query-state'
import { ShipmentsTable } from '@/components/shipments-table'
import { StatusCheckButton } from '@/components/status-check-button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { api, type ListShipmentsParams } from '@/lib/api'
import { usePagedQuery } from '@/lib/use-paged-query'

/** The questions operations asks, as filters of `GET /shipments`. */
const VIEWS = {
  all: { label: 'Todos', params: {} },
  failed: { label: 'No cargados', params: { status: 'FAILED' } },
  loaded: { label: 'Cargados', params: { status: 'LOADED' } },
  inTransit: { label: 'En viaje', params: { carrierStatus: 'IN_TRANSIT' } },
  exceptions: { label: 'Con incidencia', params: { carrierStatus: 'EXCEPTION' } },
  late: { label: 'Atrasados', params: { late: true } },
  delivered: { label: 'Entregados', params: { carrierStatus: 'DELIVERED' } },
} satisfies Record<string, { label: string; params: ListShipmentsParams }>

type View = keyof typeof VIEWS
const isView = (value: string | null): value is View => value !== null && value in VIEWS

export function ShipmentsPage() {
  // The view lives in the URL so the overview can link to it and it can be shared.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('view')
  const view: View = isView(requested) ? requested : 'all'

  const params: ListShipmentsParams = VIEWS[view].params
  const shipments = usePagedQuery(['shipments', params], (after) =>
    api.listShipments(params, after),
  )
  const rows = shipments.data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos"
        description="Estado de carga y seguimiento de los remitos enviados al transportista."
        actions={<StatusCheckButton />}
      />

      <FilterButtons
        label="Filtrar envíos"
        options={Object.entries(VIEWS).map(([value, { label }]) => ({ value: value as View, label }))}
        value={view}
        onChange={(value) => setSearchParams(value === 'all' ? {} : { view: value })}
      />

      {shipments.isPending ? (
        <ListSkeleton />
      ) : shipments.isError ? (
        <ErrorAlert title="No se pudieron cargar los envíos" error={shipments.error} />
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              {view === 'all'
                ? 'Todavía no se procesó ninguna exportación.'
                : 'No hay envíos para el filtro seleccionado.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ShipmentsTable shipments={rows} />
          <Pager paging={shipments} />
        </>
      )}
    </div>
  )
}
