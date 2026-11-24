import { Badge } from '@/components/ui/badge'
import type { CarrierStatus, Outcome, RunStatus, Service, ShipmentStatus } from '@/lib/api'
import { CARRIER_STATUS, OUTCOME, RUN_STATUS, SERVICE, SHIPMENT_STATUS } from '@/lib/labels'

/** Plain status colours, apart from the brand palette: green ok, red failed, amber watch out. */
const TONE = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
} as const

type Tone = keyof typeof TONE

function Pill({ tone, children }: { tone: Tone; children: string }) {
  return <Badge className={TONE[tone]}>{children}</Badge>
}

const OUTCOME_TONE = {
  LOADED: 'success',
  SKIPPED: 'neutral',
  FAILED: 'danger',
} as const satisfies Record<Outcome, Tone>

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <Pill tone={OUTCOME_TONE[outcome]}>{OUTCOME[outcome]}</Pill>
}

const RUN_TONE = {
  RUNNING: 'info',
  COMPLETED: 'success',
  COMPLETED_WITH_FAILURES: 'warning',
  FAILED: 'danger',
} as const satisfies Record<RunStatus, Tone>

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Pill tone={RUN_TONE[status]}>{RUN_STATUS[status]}</Pill>
}

const SHIPMENT_TONE = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  LOADED: 'success',
  FAILED: 'danger',
} as const satisfies Record<ShipmentStatus, Tone>

/** Ours: did the shipment reach the carrier? */
export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <Pill tone={SHIPMENT_TONE[status]}>{SHIPMENT_STATUS[status]}</Pill>
}

const CARRIER_TONE = {
  CREATED: 'neutral',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  EXCEPTION: 'danger',
} as const satisfies Record<CarrierStatus, Tone>

/** The carrier's: where is the shipment? */
export function CarrierStatusBadge({ status }: { status?: CarrierStatus }) {
  if (!status) return <span className="text-muted-foreground">Sin consultar</span>
  return <Pill tone={CARRIER_TONE[status]}>{CARRIER_STATUS[status]}</Pill>
}

export function LateBadge() {
  return <Pill tone="warning">Atrasado</Pill>
}

export function ServiceBadge({ service }: { service: Service }) {
  return <Pill tone={service === 'EXPRESS' ? 'warning' : 'neutral'}>{SERVICE[service]}</Pill>
}
