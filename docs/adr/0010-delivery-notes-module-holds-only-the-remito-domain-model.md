# 0010. The delivery-notes module holds only the remito domain model

- **Status:** Accepted. Supersedes the pipeline location in [0005](0005-functional-pipeline-persistence-and-idempotent-delivery.md) and [0008](0008-one-backend-module-per-rest-resource.md).
- **Date:** 2026-11-24

## Context

After ADR 0008, `backend/src/modules/delivery-notes/` still held more than the delivery note resource: the whole delivery pipeline (`pipeline/`: normalize, filter, validate, map, deliver, reasons and stages), and `EXPORT_SCHEMA`, which describes the export file rather than a remito. The pipeline is executed only by `RunsService`.

## Decision

- **`delivery-notes`** holds the `/delivery-notes` resource and the remito domain model only: `types/` (raw, stored, normalized and valid delivery note, `DeliveryNoteField`) and `schemas/` (the Zod parsers for a remito's fields, provinces and services). It imports no other feature module.
- **The pipeline moves to `runs/pipeline/`**, next to `RunsService`, which builds and executes it. Its internal layout and names are unchanged. `attempts` and `shipments` import its types (`Step`, `Outcome`, `ReasonCode`, `Reason`) but never run it.
- **`EXPORT_SCHEMA` moves into the exports reader** (`exports/reader/json-exports.reader.ts`), its only user.

## Alternatives considered

- **A top-level `src/pipeline/`:** keeps the pipeline neutral between modules, but it is a process that only runs execute, not shared infrastructure.
- **Keep normalize and validate in `delivery-notes` as domain rules:** they depend on the pipeline's reasons, failures and carrier access, so splitting them would scatter the composition that `delivery-notes.pipeline.ts` lists in one place.

## Consequences

- The remito domain model can be read without the delivery process around it.
- `attempts` now imports types from files in `runs`, a type-only dependency; it still doesn't import the runs module.
