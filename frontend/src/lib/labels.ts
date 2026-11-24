import type {
  CarrierStatus,
  Cause,
  Outcome,
  RunKind,
  RunStatus,
  Service,
  ShipmentStatus,
  Step,
} from '@/lib/api'

// The backend stores and answers English codes (and English reason messages); the UI is in
// Spanish, so every code the screens show is translated here, in one place.

export const OUTCOME: Record<Outcome, string> = {
  LOADED: 'Cargado',
  SKIPPED: 'Omitido',
  FAILED: 'Fallido',
}

export const RUN_STATUS: Record<RunStatus, string> = {
  RUNNING: 'En curso',
  COMPLETED: 'Completa',
  COMPLETED_WITH_FAILURES: 'Con fallos',
  FAILED: 'Interrumpida',
}

export const RUN_KIND: Record<RunKind, string> = {
  INITIAL: 'Inicial',
  RETRY: 'Reintento',
}

export const SHIPMENT_STATUS: Record<ShipmentStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  LOADED: 'Cargado',
  FAILED: 'No cargado',
}

export const CARRIER_STATUS: Record<CarrierStatus, string> = {
  CREATED: 'Recibido',
  IN_TRANSIT: 'En viaje',
  DELIVERED: 'Entregado',
  EXCEPTION: 'Con incidencia',
}

export const SERVICE: Record<Service, string> = {
  STANDARD: 'Normal',
  EXPRESS: 'Urgente',
}

export const STEP: Record<Step, string> = {
  UPLOAD: 'Carga',
  NORMALIZE: 'Normalización',
  FILTER: 'Filtrado',
  VALIDATE: 'Validación',
  MAP: 'Mapeo',
  DELIVER: 'Envío al transportista',
}

/** Mirrors `Cause` in backend/src/common/types/pipeline.types.ts. */
const CAUSE: Record<string, string> = {
  OTHER_CARRIER: 'Asignado a otro transportista',
  CUSTOMER_PICKUP: 'Retiro por el cliente',
  DUPLICATE_IN_EXPORT: 'Duplicado en la exportación',
  IN_PROGRESS_ELSEWHERE: 'En proceso en otra corrida',
  MISSING_CARRIER: 'Sin transportista',
  UNKNOWN_CARRIER: 'Transportista desconocido',
  MISSING_DELIVERY_NOTE_NUMBER: 'Sin número de remito',
  CONFLICTING_DUPLICATE: 'Duplicado con datos distintos',
  LOADED_WITH_DIFFERENT_DATA: 'Ya cargado con datos distintos',
  MISSING_RECIPIENT_NAME: 'Falta el destinatario',
  MISSING_ADDRESS: 'Falta la dirección',
  MISSING_CITY: 'Falta la localidad',
  MISSING_PROVINCE: 'Falta la provincia',
  UNKNOWN_PROVINCE: 'Provincia desconocida',
  PROVINCE_NOT_SERVED: 'Provincia sin cobertura del transportista',
  MISSING_POSTAL_CODE: 'Falta el código postal',
  MISSING_PACKAGES: 'Faltan los bultos',
  INVALID_PACKAGES: 'Cantidad de bultos ilegible',
  TOO_FEW_PACKAGES: 'Cantidad de bultos inválida (mínimo 1)',
  MISSING_WEIGHT: 'Falta el peso',
  INVALID_WEIGHT: 'Peso ilegible',
  NON_POSITIVE_WEIGHT: 'Peso inválido (debe ser mayor a 0)',
  INVALID_DECLARED_VALUE: 'Valor declarado ilegible',
  NEGATIVE_DECLARED_VALUE: 'Valor declarado negativo',
  MISSING_SERVICE: 'Falta el servicio',
  UNKNOWN_SERVICE: 'Servicio desconocido',
  REJECTED_BY_CARRIER: 'Rechazado por el transportista',
  CARRIER_UNAVAILABLE: 'Transportista no disponible',
  INVALID_CARRIER_CREDENTIALS: 'Credenciales rechazadas por el transportista',
  RUN_INTERRUPTED: 'Corrida interrumpida',
  INTERNAL_ERROR: 'Error interno',
}

/** A cause in Spanish; an unknown code (a backend newer than this UI) is shown as is. */
export const causeLabel = (cause: Cause) => CAUSE[cause] ?? cause
