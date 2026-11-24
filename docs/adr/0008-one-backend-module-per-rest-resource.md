# 0008. One backend module per REST resource

- **Status:** Accepted. Supersedes the "Package by feature" module list of [0005](0005-functional-pipeline-persistence-and-idempotent-delivery.md).
- **Date:** 2026-11-24

## Context

ADR 0005 split the backend into `delivery-notes`, `runs`, `reports`, `shipments` and `carriers`. That cut resources by reading vs. writing: `POST /runs` lived in `runs`, while `GET /runs` and `GET /runs/:id` lived in `reports` (`runs-report.controller.ts`), next to `attempts.controller.ts`. `delivery-notes` also served `/exports`. Finding every operation on a resource meant looking in several packages, and file names didn't say which package or resource they belonged to.

## Decision

- **One package under `backend/src/modules/` per REST resource**, holding all of its operations: `exports`, `delivery-notes`, `runs`, `attempts`, `shipments`. `carriers` stays as a package with no routes. `reports` is removed: run reads moved to `runs`, attempt reads to `attempts`.
- **Every file is named after its package:** one `<package>.controller.ts`, `<package>.service.ts`, `<package>.repository.ts`, `<package>.mapper.ts`, `<package>.errors.ts` and `<package>.module.ts`. A package that writes another resource's table keeps a second, prefixed repository (`runs-shipments.repository.ts`).
- The export reader and storage moved to `exports` and were renamed accordingly (`EXPORTS_READER`, `EXPORTS_STORAGE`), superseding the names in [0004](0004-delivery-notes-export-storage.md).
- **Dependencies:** `shipments → runs → exports → delivery-notes`, and `runs → delivery-notes, carriers`. `attempts` is read-only and depends on nothing; `runs` records attempts through its own repository.

The HTTP API is unchanged.

## Alternatives considered

- **Keep `reports` as a read model:** a valid CQRS split, but it scatters one resource across packages, which is what this change removes.
- **Keep exports inside `delivery-notes`:** they are uploaded together, but they are separate resources with separate routes.

## Consequences

- Each resource's routes, rules and queries are in one folder.
- The pipeline stays in `delivery-notes/pipeline/`; it is not a resource.
