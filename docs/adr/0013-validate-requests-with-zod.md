# 0013. Validate requests with Zod

- **Status:** Superseded by [0014](0014-class-validator-for-dtos-zod-for-data.md). Superseded the class-validator request DTOs of [0004](0004-delivery-notes-export-storage.md) and [0005](0005-functional-pipeline-persistence-and-idempotent-delivery.md).
- **Date:** 2026-11-24

## Context

The backend validated with two libraries. Request DTOs used class-validator and class-transformer through Nest's `ValidationPipe`, while everything else was Zod: the environment, the export's fields, the pipeline's rules and the carrier's answers. Nest 12 ships `StandardSchemaValidationPipe`, and `@Query`, `@Body` and `@Param` accept a `{ schema }` option, so Zod can validate requests too.

## Decision

- **Requests are validated with Zod.** Each `*.request.dto.ts` exports a schema (`XXX_REQUEST_SCHEMA`) and its inferred type (`XxxRequestDto`). Listings extend `PAGE_REQUEST_SCHEMA`; ids use `ID_SCHEMA` (`z.uuidv4()`).
- **A global `StandardSchemaValidationPipe`** (`APP_PIPE`) validates each parameter that declares a schema and passes on the parsed value: `z.coerce` turns query strings into numbers and dates, and defaults are applied.
- **Schemas are strict** (`z.strictObject`), so an unknown query parameter or body field is a 400, as `forbidNonWhitelisted` did.
- **class-validator and class-transformer are uninstalled.**

## Alternatives considered

- **Keep class-validator:** it works, but it's a second validation library with a different style for the same job.

## Consequences

- One validation library. Request types come from their schemas, so they can't drift apart.
- Validation error messages come from Zod and are worded differently; the status (400) and Nest's body format are unchanged.
