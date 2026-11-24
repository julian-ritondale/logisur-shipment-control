import type { Shipment } from '@/lib/api'
import { formatDay } from '@/lib/format'
import { causeLabel } from '@/lib/labels'

/** Why operations should look at a shipment, or nothing if it is on track. */
export function attentionReason(shipment: Shipment): string | undefined {
  if (shipment.status === 'FAILED') {
    return shipment.cause ? causeLabel(shipment.cause) : 'Envío no cargado'
  }
  if (shipment.carrierStatus === 'EXCEPTION') return 'Incidencia informada por el transportista'
  if (shipment.late && shipment.estimatedDelivery) {
    return `Entrega estimada vencida (${formatDay(shipment.estimatedDelivery)})`
  }
  return undefined
}
