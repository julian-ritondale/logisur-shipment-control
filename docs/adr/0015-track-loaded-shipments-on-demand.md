# 0015. Track loaded shipments on demand

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The brief names three things LogiSur's operations team only learns about when a customer calls: a shipment that wasn't loaded, one with missing data, and one that is late. Runs, attempts and causes covered the first two. Nothing covered lateness, although the carrier's API reports each shipment's status and estimated delivery (`GET /v1/shipments/{tracking_id}`). Our own status also said `DELIVERED` for "loaded into the carrier", which would clash with the carrier's `DELIVERED` ("the customer received it"); it was renamed `LOADED` first.

## Decision

- **The carrier contract gains `track(trackingId)`,** which Expreso Andino implements over `GET /v1/shipments/{tracking_id}` with the same retry policy. An undocumented status is not guessed: it fails like an unavailable carrier.
- **`POST /shipments/status-checks`** asks the carrier about every `LOADED` shipment it hasn't delivered, sequentially, and stores `carrierStatus`, `estimatedDelivery` and `statusCheckedAt` on the shipment. A shipment the carrier can't answer for keeps its last status and counts as failed; one already delivered is not asked again. The answer counts what needs attention (`late`, `exceptions`).
- **`late` is computed, never stored:** past its estimated delivery day (UTC) and not delivered. `GET /shipments` returns it and filters by it (`late`, `carrierStatus`).
- **On demand, not scheduled:** the check runs when someone asks (the UI's refresh). This follows the synchronous design of runs.

## Alternatives considered

- **A periodic job (`@nestjs/schedule` with `@nestjs/locks`):** what production needs, but it adds scheduling and locking for a demo that runs on request. It is in the roadmap in `SOLUCION.md`.
- **Check the status inside each run:** a run would get slower and still go stale between runs.
- **Store `late`:** it would need recomputing every day; computing it on read is always current.

## Consequences

- Operations can list what needs a look: failed, late and exception shipments.
- A check over many shipments is one long request, like a run; moving both to a queue is the same roadmap item.
