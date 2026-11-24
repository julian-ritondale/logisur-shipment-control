# 0011. No database migrations until the schema settles

- **Status:** Accepted. Supersedes how the schema is applied in [0005](0005-functional-pipeline-persistence-and-idempotent-delivery.md) (`prisma migrate deploy`).
- **Date:** 2026-11-24

## Context

The schema is still changing with each refactor (most recently `reason_code` became `cause`). There is no production database and no data to preserve, so each migration was bookkeeping for a schema that would change again.

## Decision

- **No migrations for now.** `backend/prisma/migrations/` is empty (a `.gitkeep` keeps the folder). When the schema settles, one `init` migration is created with `npm run prisma:migrate -- --name init`, and this ADR is superseded.
- **The schema is applied with `prisma db push`:**
  - the backend container runs `prisma db push --accept-data-loss` before starting;
  - the e2e setup (`backend/test/global-setup.ts`) recreates `logisur_test` with `prisma db push --force-reset --accept-data-loss`;
  - locally, `npm run prisma:push` after editing the schema.

## Alternatives considered

- **Keep writing migrations:** correct for a deployed system, but pure overhead while nothing is deployed.
- **Squash the existing migrations into a new init on every change:** the same result with more steps.

## Consequences

- Schema changes are one edit to `schema.prisma`.
- `db push` drops columns and data that no longer fit the schema. That is acceptable only because no database holds data worth keeping; it must not run against a real database.
- Prisma refuses destructive `db push` runs started by an AI agent unless the user consents, so agents must ask before running the e2e suite after a schema change.
