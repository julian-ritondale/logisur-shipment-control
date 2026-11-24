# 0014. class-validator for DTOs, Zod for data

- **Status:** Accepted. Supersedes [0013](0013-validate-requests-with-zod.md).
- **Date:** 2026-11-24

## Context

ADR 0013 moved request validation from class-validator DTOs to Zod schemas, to use one validation library. That traded away the convention a Nest reader expects: request DTOs as classes validated by `ValidationPipe`, which `@nestjs/swagger` can also read to document the API. Request DTOs and untrusted data are different jobs, and each library fits one of them.

## Decision

The split is by job:

- **class-validator and class-transformer for DTOs and API requests.** Every request DTO is a class (`XxxRequestDto`) with class-validator decorators, validated by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). class-transformer converts query strings (`@Type(() => Number)`, `@Type(() => Date)`). Ids use `IdRequestDto`.
- **Zod for JSON and untrusted data:** the environment schema, the export file and the remito fields, the pipeline's validation rules, and the carrier's API answers.

The code of ADR 0013 was reverted.

## Alternatives considered

- **Zod everywhere (ADR 0013):** one library, but request DTOs stop looking like Nest DTOs and lose the class metadata that Swagger and other Nest tooling read.

## Consequences

- Two validation libraries, each with a clear job. A request DTO is never a Zod schema, and untrusted data is never validated with class-validator.
