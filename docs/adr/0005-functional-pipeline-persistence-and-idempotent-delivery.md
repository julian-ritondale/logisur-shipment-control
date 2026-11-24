# 0005. Functional pipeline, per-step persistence and idempotent delivery

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Uploaded exports now have to be filtered, validated and loaded into a carrier's API. LogiSur needs to know, for every remito, whether it was sent, skipped or failed, at which step and why, in business terms, and to be able to query all of it later. Failures must be retryable without sending anything twice, and a retry shouldn't redo work that already succeeded. Only Expreso Andino has an API today, but the design shouldn't be tied to it. The full reasoning, in Spanish, is in [`SOLUCION.md`](../../SOLUCION.md).

## Decision

- **Package by feature.** `src/modules/` holds `delivery-notes`, `runs`, `reports`, `shipments` and `carriers`. Each package has its own controller, service, repository and DTOs, and only repositories touch the database. Dependencies point one way: `shipments → runs → delivery-notes, reports, carriers`.
- **REST resources.**
  - `POST /exports` uploads and stores an export. `POST /runs { exportId }` runs it.
  - Retries are new runs: `POST /runs/:id/retries` and `POST /shipments/:id/retries`.
  - Every listing (`exports`, `delivery-notes`, `runs`, `attempts`, `shipments`) is cursor-paginated, with typed filters in its request DTO.
  - A run returns totals plus a breakdown by outcome, step and reason. The per-remito detail is `GET /attempts`.
- **The pipeline is a composition of helpers.**
  - It runs `UPLOAD → NORMALIZE → FILTER → VALIDATE → MAP → DELIVER` and lives in `modules/delivery-notes/pipeline/`.
  - `delivery-notes.pipeline.ts` puts together plain helper folders (`normalizer/`, `filter/`, `validator/`, `mapper/`, `deliverer/`), and none of them is a Nest module.
  - VALIDATE, MAP and DELIVER are `Stage`s (`{ step, run(input) → Result }`). `runStages` runs them from any step, calling back after each one.
  - `RunsService` executes the pipeline and persists each step's output.
- **Normalize, then filter, then validate.**
  - Normalization is carrier-agnostic and never fails.
  - Filters are functions `candidates → { kept, decided }`. `composeFilters` combines them in order (`byCarrier`, `hasNumber`, `dedupeWithinExport`, `alreadyDelivered`).
  - Validation is the carrier's requirements, so it only runs on the remitos the run will send.
- **Strict types, tables and Zod.**
  - A normalized field is a `Field<T>`: `VALID` with its value, `MISSING`, or `INVALID` with the raw text. There's no `null` or `unknown` in pipeline or storage types, and raw data is typed as JSON.
  - Zod does the parsing: field parsers, whitelists (`lookup(table)`) for carriers, provinces and services, the export's shape, and the carrier's API responses.
  - Validation is a Zod schema whose error messages are reason codes, and every reason's message is in one catalogue.
  - Branching uses tables and named constants: carrier decisions, delivery outcomes, HTTP answers, API field names and limits.
  - Request DTOs stay on class-validator with the global `ValidationPipe`. The environment is validated with a Zod schema (`ConfigModule.forRoot({ validationSchema })`).
- **Persistence: PostgreSQL with Prisma 7.**
  - Nothing is stored for an unreadable file.
  - Once it's readable, the export and every remito, for every carrier, are stored raw.
  - `Shipment` (unique per carrier and `external_ref`) stores each step's output. `Attempt` records each remito's outcome in each `Run`.
- **Idempotent delivery by `external_ref`** (= `nro_remito`, unique at the carrier). An idempotent repeat is the same outcome as a first delivery: `DELIVERED`, with no separate "already exists" case.
  - Delivered earlier with the same data: `DELIVERED` without calling the carrier. With different data: it fails.
  - An atomic claim (`PENDING`/`FAILED` → `PROCESSING`) prevents concurrent processing.
  - `201` and `409` both mean delivered.
  - After an ambiguous failure, the client looks the reference up before re-POSTing.
  - Retries with backoff use `@nestjs/resilience`'s `RetryPolicy`.
- **Retries resume.** A failed delivery resends its stored request. Anything earlier is re-validated from the stored normalized remito.
- **Carriers:** the carrier to process is configuration (`CARRIER`). Carriers are reached only through the `CarrierRouter` (`CARRIER_ROUTER` token). Integrations live in `src/integrations/<carrier>/`, and Expreso Andino's is the only one.
- **Language:** stored values and the messages shown to users are English. `SOLUCION.md` is the one document in Spanish.
- **Synchronous runs.** `POST /runs` processes the whole export before answering.

## Alternatives considered

- **Uploading and running in one multipart `POST /runs`:** replaced by separate `exports` and `runs` resources, so each id in a URL is the resource it names and an export can be run again.
- **Recording "already delivered" as its own outcome:** rejected. An idempotent repeat is a delivery, and a separate case adds noise without informing anything.
- **Hand-written parsers and `if` chains for normalizing and validating:** replaced by Zod schemas and tables, which are shorter and declarative.
- **Validating every remito before filtering:** rejected. A broken remito for another carrier would show up as a failure in this carrier's run.
- **A queue (Redis/BullMQ) and nightly jobs now:** postponed for time and testing cost (see `SOLUCION.md`).

## Consequences

- Everything is queryable with filters and pages. Every API route is RESTful and documented in `SOLUCION.md`.
- Tests:
  - Unit tests cover the helpers, the pipeline composition, the reader and the Expreso client (with a scripted `fetch`), with no database.
  - E2E tests need PostgreSQL (`logisur_test`, created by `docker/postgres/init.sql`) and replace the carrier router with a fake.
- If the process dies mid-run, shipments stay in `PROCESSING` and need a recovery job (roadmap).
- Long exports or a slow carrier can hit request timeouts until runs become asynchronous.
