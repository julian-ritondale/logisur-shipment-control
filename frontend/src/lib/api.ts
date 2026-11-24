// Types mirror the backend response/request DTOs under backend/src/modules/**/dto.

export type Carrier = 'EXPRESO_ANDINO' | 'CRUZ_DEL_NORTE' | 'TRANSPORTE_LITORAL' | 'CUSTOMER_PICKUP'

export type Step = 'UPLOAD' | 'NORMALIZE' | 'FILTER' | 'VALIDATE' | 'MAP' | 'DELIVER'
export type Outcome = 'LOADED' | 'SKIPPED' | 'FAILED'
export type RunKind = 'INITIAL' | 'RETRY'
export type RunStatus = 'RUNNING' | 'COMPLETED' | 'COMPLETED_WITH_FAILURES' | 'FAILED'
export type ShipmentStatus = 'PENDING' | 'PROCESSING' | 'LOADED' | 'FAILED'
/** The carrier's own tracking status. `DELIVERED` means the customer received it. */
export type CarrierStatus = 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
export type Province = string
export type Service = 'STANDARD' | 'EXPRESS'

/** Backend `Cause` is a large string union; the UI only displays it. */
export type Cause = string

export interface Page<T> {
  items: T[]
  /** Pass as `after` to get the next page; absent on the last one. */
  nextCursor?: string
}

export interface ExportResponse {
  id: string
  uploadedAt: string
  deliveryNoteCount: number
}

export interface Reason {
  cause: Cause
  message: string
}

export interface RunTotals {
  total: number
  loaded: number
  failed: number
  skipped: number
}

export interface RunBreakdown {
  outcome: Outcome
  step: Step
  cause?: Cause
  count: number
}

export interface RunSummary {
  id: string
  kind: RunKind
  parentRunId?: string
  exportId: string
  carrier: string
  carrierName: string
  status: RunStatus
  totals: RunTotals
  startedAt: string
  finishedAt?: string
}

export interface Run extends RunSummary {
  breakdown: RunBreakdown[]
}

export interface Attempt {
  id: string
  runId: string
  shipmentId?: string
  deliveryNoteId: string
  deliveryNoteNumber?: string
  /** Zero-based position of the delivery note in its export. */
  position: number
  fromStep: Step
  reachedStep: Step
  outcome: Outcome
  cause?: Cause
  reason?: string
  issues?: Reason[]
  trackingId?: string
  detail?: Record<string, unknown>
  /** Whether `POST /shipments/:shipmentId/retries` can retry it now. */
  retryable: boolean
  createdAt: string
}

/** A value read from the export: understood, absent, or present but not understood. */
export type Field<T> =
  | { status: 'VALID'; value: T }
  | { status: 'MISSING' }
  | { status: 'INVALID'; raw: string }

/** A remito after NORMALIZE. */
export interface NormalizedDeliveryNote {
  number: Field<string>
  carrier: Field<Carrier>
  recipient: {
    name: Field<string>
    street: Field<string>
    city: Field<string>
    province: Field<Province>
    postalCode: Field<string>
    phone: Field<string>
  }
  packages: Field<number>
  weightKg: Field<number>
  declaredValue: Field<number>
  service: Field<Service>
}

export interface Shipment {
  id: string
  carrier: string
  carrierName: string
  deliveryNoteId: string
  deliveryNoteNumber: string
  status: ShipmentStatus
  lastCompletedStep?: Step
  failedStep?: Step
  cause?: Cause
  reason?: string
  trackingId?: string
  loadedAt?: string
  carrierStatus?: CarrierStatus
  /** `YYYY-MM-DD`, from the carrier. */
  estimatedDelivery?: string
  statusCheckedAt?: string
  /** Past its estimated delivery and not delivered to the customer. */
  late: boolean
  createdAt: string
  updatedAt: string
}

export interface ShipmentDetail extends Shipment {
  normalized?: NormalizedDeliveryNote
  /** What was sent to the carrier. */
  payload?: Record<string, unknown>
}

export interface StatusCheck {
  checked: number
  failed: number
  late: number
  exceptions: number
  checkedAt: string
}

export interface DeliveryNote {
  id: string
  exportId: string
  /** Zero-based position in the export. */
  position: number
  number?: string
  carrier?: Carrier
  /** The remito exactly as exported. */
  raw: Record<string, unknown>
}

export interface ListRunsParams {
  status?: RunStatus
  kind?: RunKind
  exportId?: string
  limit?: number
}
export interface ListAttemptsParams {
  runId?: string
  shipmentId?: string
  outcome?: Outcome
  deliveryNoteNumber?: string
  limit?: number
}
export interface ListShipmentsParams {
  status?: ShipmentStatus
  deliveryNoteNumber?: string
  carrierStatus?: CarrierStatus
  late?: boolean
  limit?: number
}
export interface ListDeliveryNotesParams {
  exportId?: string
  number?: string
  limit?: number
}

/** Nest's default error body. `message` is a string[] for validation errors. */
interface ErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as ErrorBody
      message = Array.isArray(body.message) ? body.message.join('; ') : body.message
    } catch {
      // Non-JSON error body (e.g. a proxy error): keep the generic message.
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

function query(params: object, after?: string): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, after })) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const MAX_PAGE_SIZE = 100
/** Upper bound for `listAll`: 20 pages of 100. */
const MAX_ITEMS = 2000

/**
 * Every item of a listing, for the overview's counts.
 * The backend has no aggregate endpoints yet; a day's volume fits well under `MAX_ITEMS`.
 * `truncated` says the cap was hit, so the screen can say its numbers are partial.
 */
async function listAll<T, P extends { limit?: number }>(
  list: (params: P, after?: string) => Promise<Page<T>>,
  params: P,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = []
  let after: string | undefined
  do {
    const page = await list({ ...params, limit: MAX_PAGE_SIZE }, after)
    items.push(...page.items)
    after = page.nextCursor
  } while (after && items.length < MAX_ITEMS)
  return { items, truncated: after !== undefined }
}

export const api = {
  uploadExport(file: File) {
    const body = new FormData()
    body.append('file', file)
    return request<ExportResponse>('/exports', { method: 'POST', body })
  },
  listExports: (after?: string) => request<Page<ExportResponse>>(`/exports${query({}, after)}`),
  getExport: (id: string) => request<ExportResponse>(`/exports/${id}`),

  listDeliveryNotes: (params: ListDeliveryNotesParams, after?: string) =>
    request<Page<DeliveryNote>>(`/delivery-notes${query(params, after)}`),
  getDeliveryNote: (id: string) => request<DeliveryNote>(`/delivery-notes/${id}`),

  startRun: (exportId: string) =>
    request<Run>('/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportId }),
    }),
  retryRun: (id: string) => request<Run>(`/runs/${id}/retries`, { method: 'POST' }),
  listRuns: (params: ListRunsParams, after?: string) =>
    request<Page<RunSummary>>(`/runs${query(params, after)}`),
  getRun: (id: string) => request<Run>(`/runs/${id}`),

  listAttempts: (params: ListAttemptsParams, after?: string) =>
    request<Page<Attempt>>(`/attempts${query(params, after)}`),

  listShipments: (params: ListShipmentsParams, after?: string) =>
    request<Page<Shipment>>(`/shipments${query(params, after)}`),
  getShipment: (id: string) => request<ShipmentDetail>(`/shipments/${id}`),
  retryShipment: (id: string) => request<Run>(`/shipments/${id}/retries`, { method: 'POST' }),
  checkStatuses: () => request<StatusCheck>('/shipments/status-checks', { method: 'POST' }),

  allShipments: (params: ListShipmentsParams = {}) => listAll(api.listShipments, params),
}
