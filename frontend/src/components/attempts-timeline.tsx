import { DetailLink } from '@/components/detail-link'
import { OutcomeBadge } from '@/components/status-badge'
import type { Attempt, Step } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { causeLabel, STEP } from '@/lib/labels'

/** Runs start at NORMALIZE (or FILTER); a retry resumes at the step that failed. */
const RESUMED_FROM = new Set<Step>(['VALIDATE', 'MAP', 'DELIVER'])

/** One line on what happened to a delivery note in a run. */
function attemptSummary(attempt: Attempt): string {
  if (attempt.outcome === 'LOADED') {
    return attempt.trackingId
      ? `Cargado en el transportista (tracking ${attempt.trackingId})`
      : 'Cargado en el transportista'
  }
  return attempt.cause ? causeLabel(attempt.cause) : `Se detuvo en ${STEP[attempt.reachedStep]}`
}

/** What happened to a delivery note in each run, newest first, in business terms. */
export function AttemptsTimeline({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin procesamientos registrados.</p>
  }
  const newestFirst = [...attempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <ol className="space-y-3 border-l pl-5">
      {newestFirst.map((attempt) => (
        <li key={attempt.id} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-brand-indigo" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <OutcomeBadge outcome={attempt.outcome} />
            <span className="text-muted-foreground">{formatDateTime(attempt.createdAt)}</span>
            <span className="text-muted-foreground">·</span>
            <DetailLink
              to={`/runs/${attempt.runId}`}
              className="text-brand-blue underline-offset-4 hover:underline"
            >
              Ver corrida
            </DetailLink>
          </div>
          <p className="mt-1 text-sm">
            {attemptSummary(attempt)}
            {attempt.outcome !== 'LOADED' && ` (en ${STEP[attempt.reachedStep]})`}.
          </p>
          <IssueList attempt={attempt} />
          {RESUMED_FROM.has(attempt.fromStep) && (
            <p className="text-xs text-muted-foreground">
              Reintento desde la etapa {STEP[attempt.fromStep]}.
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Every problem found, when there was more than one. */
export function IssueList({ attempt }: { attempt: Attempt }) {
  if (!attempt.issues || attempt.issues.length < 2) return null
  return (
    <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
      {attempt.issues.map((issue) => (
        <li key={issue.cause}>{causeLabel(issue.cause)}</li>
      ))}
    </ul>
  )
}
