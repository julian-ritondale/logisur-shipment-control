import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'

/** Asks the carrier where every loaded, undelivered shipment is, then refreshes the shipments. */
export function StatusCheckButton() {
  const queryClient = useQueryClient()
  const check = useMutation({
    mutationFn: api.checkStatuses,
    onSuccess: (result) => {
      const message = `Estado actualizado: ${result.checked} envíos consultados, ${result.late} atrasados, ${result.exceptions} con incidencia`
      if (result.failed > 0) {
        toast.warning(`${message}. Sin respuesta del transportista para ${result.failed}.`)
      } else {
        toast.success(message)
      }
      void queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Button onClick={() => check.mutate()} disabled={check.isPending}>
      {check.isPending ? <Spinner /> : <RefreshCw />}
      {check.isPending ? 'Actualizando...' : 'Actualizar estado'}
    </Button>
  )
}
