# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

The official NestJS agent skills are installed with `npx @nestjs/skills add --agent all`, which also updates them: the mistakes agents make in Nest apps, with recipes checked on the released packages. An agent loads a skill when a task matches it.

Nest has first-party packages for these, so check them before adding another library or writing your own:

- Databases: [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm.md), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb.md), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize.md).
- OpenAPI: [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction.md). GraphQL: [`@nestjs/graphql`](https://docs.nestjs.com/graphql/quick-start.md). WebSockets: [`@nestjs/websockets`](https://docs.nestjs.com/websockets/gateways.md). Microservices: [`@nestjs/microservices`](https://docs.nestjs.com/microservices/basics.md).
- Sign-in: [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication.md). Permissions: [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization.md). Rate limiting: [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md).
- Configuration: [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md). Caching: [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md). Health checks: [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus.md). Events inside the app: [`@nestjs/event-emitter`](https://docs.nestjs.com/application/events.md).
- Email: [`@nestjs/mail`](https://docs.nestjs.com/application/mail.md). Files, S3 included: [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage.md). Translations: [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n.md).
- Retries, timeouts and circuit breakers: [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience.md).
- Idempotency keys: [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md). Transactional outbox: [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox.md). Sending and receiving webhooks: [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks.md).
- Queues: [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues.md). Scheduled jobs: [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling.md).
- Running a scheduled job on one instance, and locks: [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks.md). Processes that take days: [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows.md).
- Language models, tools and agents: [`@nestjs/ai`](https://docs.nestjs.com/ai/overview.md). MCP servers: [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview.md).

Before adding a filter, pipe, guard, interceptor or helper module, check whether Nest already does the job (see "Use the framework before writing your own" in the root `AGENTS.md`). Look at the docs, the `@nestjs/*` `.d.ts` files in `node_modules`, and the skills in `.claude/skills/`. In this project:

- **Errors:** Nest's built-in exception handler already answers every `HttpException` with its status and the standard `{ statusCode, message, error }` body. It also turns unknown errors into a logged 500. Don't write a catch-all filter. Services throw `ApplicationError` kinds (`src/common/errors/`), and `ApplicationErrorFilter` only maps them to Nest exceptions. To add a new kind, add one mapping there.
- **Validation:** a global `ValidationPipe` (in `AppModule` as `APP_PIPE`) with class-validator DTOs. Don't check request input by hand in controllers.
- **Uploads:** `FileInterceptor` with multer `limits` (over the limit is a 413) and `ParseFilePipe` (a missing file is a 400).
- **Global pipes, filters and guards:** register them as `APP_*` providers in `AppModule`, not in `main.ts`, so tests that boot `AppModule` get them too.

Validation works with Zod, Valibot, ArkType or any other Standard Schema library, with no classes or decorator metadata: `StandardSchemaValidationPipe` with `@Body({ schema })` or `@Param('id', { schema })` (https://docs.nestjs.com/application/validation.md). `class-validator` still works, through `ValidationPipe`.

`NodeAdapter` from `@nestjs/platform-node` is the fastest HTTP adapter, ahead of Fastify (https://docs.nestjs.com/http/performance.md).

A route handler can return a web `Response`, a `ReadableStream` or an async generator, and Nest streams it as it's produced (https://docs.nestjs.com/http/streaming-responses.md).

Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest, so mocks are `vi.fn()`, not `jest.fn()`.

In this project, `src/main.ts` creates the app and listens on `PORT` (3000 by default), and `src/app.module.ts` is the root module that imports the feature modules (see "Layout" below). Unit tests sit beside the code as `*.spec.ts` and the e2e tests are in `test/`; Vitest runs them (`npm test`, `npm run test:e2e`).

When a task says how to test, follow it. When it says nothing, cover the behaviour you change with focused tests rather than adding broad e2e suites.

## Layout: package by feature

```
src/
  main.ts, app.module.ts    bootstrap; AppModule only wires config, the global filter and pipe, and the feature modules
  config/                   environment schema (Zod)
  common/                   cross-cutting pieces: application errors and their filter, shared DTOs (id, paging),
                            types (Field, JSON) and Zod helpers (fieldParser, lookup)
    http/                   ApiClient: the generic base for clients of third-party JSON APIs
  prisma/                   PrismaModule / PrismaService (the single database client)
  generated/prisma/         Prisma client (generated, git-ignored)
  integrations/<carrier>/   one carrier: its API client, its CarrierClient adapter and its module
  modules/
    carriers/               carrier registry (a table of names and spellings), CarrierClient contract, CarrierRouter
    delivery-notes/         exports and delivery notes; types/, schemas/ (Zod) and pipeline/ (the steps)
    runs/                   execute the pipeline over an export, and retries; saves each shipment's progress
    reports/                read runs and attempts
    shipments/              read shipments, and retry one (through runs)
```

- **Each package under `modules/` owns its controller, service, repository, DTOs and errors.** It imports only the files it uses.
- **A package that touches the database does it through its own repository.** Services hold the rules and never call Prisma directly.
- **Dependencies point one way:** `shipments → runs → delivery-notes, reports, carriers`. `runs` writes shipment progress through its own `RunShipmentsRepository`, so it never needs the `shipments` module.

## REST API

- **Resources, not actions.** Ids in a URL always belong to the resource the URL names. Actions are resources created with `POST`, for example `POST /runs` and `POST /runs/:id/retries`. The full list of routes is in `SOLUCION.md` ("API").
- **Every listing is cursor-paginated** (`PageRequestDto`: `after`, `limit`; answers `PageResponseDto`: `items`, `nextCursor`) and filters through typed fields in its request DTO.
- **Answers:** `201` on create, `404` for an unknown id, `409` for a conflict with the current state, `422` for unusable content, and `400` for invalid input (via the DTOs).

## Conventions for features

- **Layers.**
  - The controller handles HTTP only. It turns the request into plain inputs (params, body, uploaded file), makes one service call and wraps the result in a response DTO. Multipart parsing, size limits and "file required" belong to the controller, because they're part of HTTP.
  - The service holds the rules. It knows nothing about HTTP (no Express, no multer, no `HttpException`) and takes plain values such as a `Buffer`, so a CLI, a job or a queue worker can call it too.
  - The repository holds the queries.
- **DTOs.** Name them by direction, one per use case:
  - `*.request.dto.ts` / `XxxRequestDto` for validated input (params, query, body);
  - `*.response.dto.ts` / `XxxResponseDto` for output, built from the service's result.

  Keep them in the feature's `dto/` folder. Shared ones (`IdRequestDto`, `PageRequestDto`, `PageResponseDto`) are in `common/dto/`.
- **Mappers.** Each package converts between DTOs and its own types in `<feature>.mapper.ts`, as plain functions: `toXxxDto(row)` builds a response DTO, and `fromXxxRequestDto(dto)` turns a request DTO into what the repository takes (listings use `fromPageRequestDto` to split off the cursor). Services call the mapper and never build or pick apart DTOs inline.
- **Swappable parts are interfaces injected by token.** A dependency that could have several implementations is a small TypeScript `interface` plus a `Symbol` token, both in the same file:
  - where exports are stored (`DELIVERY_NOTES_STORAGE`);
  - how they are read (`DELIVERY_NOTES_READER`);
  - how a carrier is reached (`CARRIER_ROUTER`).

  The service injects it with `@Inject(TOKEN)` and imports the interface with `import type`, never an implementation class. Keep these interfaces to the few methods the service needs.
- **One module per implementation, picked through imports.** Each implementation has its own module that provides and exports the token, for example `PrismaDeliveryNotesStorageModule` and `JsonDeliveryNotesReaderModule`. The feature module selects them in `imports`, so switching implementations is a one-line change. In tests, provide the token with a fake (`{ provide: TOKEN, useValue: ... }`) or use `.overrideProvider(TOKEN)`.
- **Errors.** Services throw feature errors that extend an `ApplicationError` kind, each in the package's `*.errors.ts`. `ApplicationErrorFilter` maps the kinds to HTTP statuses, so unit tests assert on these classes, not on HTTP exceptions:
  - `NotFoundError` → 404
  - `UnprocessableContentError` → 422
  - `ConflictError` → 409
- **Ids in URLs are opaque UUIDs**, validated with `IdRequestDto` (`@IsUUID('4')`). Don't leak storage details such as file names or extensions into the API.

## The delivery notes pipeline (`modules/delivery-notes/pipeline/`)

How it works, in Spanish, with the data model and reason catalogue: [`SOLUCION.md`](../SOLUCION.md). Decision: `docs/adr/0005-*.md`.

- **The pipeline is a composition, not a service.** `delivery-notes.pipeline.ts` lists which helper does each step, and in which order; read it first. Each helper is a folder of plain functions: no Nest module, no controller, no I/O of its own.

  | Step | Helper | What it is |
  | --- | --- | --- |
  | NORMALIZE | `normalizer/` | `normalize(raw)`: cleans one remito, never fails |
  | FILTER | `filter/` | `Filter`s (`candidates → { kept, decided }`) combined by `composeFilters` |
  | VALIDATE | `validator/` | `validate(note, servedProvinces)`, a Zod schema of rules, and its stage `validator(carrier)` |
  | MAP | `mapper/` | `mapper(carrier)`: to the carrier's request format |
  | DELIVER | `deliverer/` | `deliverer(carrier)` and `fromDeliveryOutcome` |

- **Stages.** VALIDATE, MAP and DELIVER are `Stage`s: `{ step, run(input) → Result }`, defined in `stage.ts`. `runStages` runs them in order from any step and calls back after each one; that callback is where the caller saves the output. A retry resumes by starting at a later step.
- **Executing it** is `RunsService`'s job, in the runs module. It builds the pipeline for a run, runs it, and persists through `RunsRepository` and `RunShipmentsRepository`. Business rules belong in the helpers, never in the service.
- **To add or reorder a filter or a stage,** write the helper and change `deliveryNotesPipeline()`. Test the helper on its own, and the composition in `delivery-notes.pipeline.spec.ts`, with no database.
- **Reasons:** every way a remito can stop is a `ReasonCode` in the catalogue in `pipeline/reasons.ts`, with an English message LogiSur can act on. Never put technical text (stack traces, HTTP bodies) in a message; that belongs in `detail`.
- **Strict types, tables, Zod:**
  - Normalized fields are `Field<T>` (`VALID`, `MISSING` or `INVALID` with the raw text). Pipeline and storage types have no `null` or `unknown`, raw data is `JsonObject`, and repositories map database nulls to optional properties.
  - Parse untrusted data with Zod, not by hand: field parsers and whitelists (`lookup(table)`) in `schemas/`, rules in `validator/`, and the carrier's API responses.
  - Prefer a table or a schema to `if` chains: the carrier registry, province and service aliases, filter decisions, delivery outcomes, HTTP answers and API field names are all tables.
  - Name every limit and status (`MIN_PACKAGES`, `Step.VALIDATE`, `HttpStatus.CREATED`); don't use bare literals.
- **Idempotent means the same outcome.** If the carrier already has a shipment, it's `DELIVERED`, exactly like a new one; don't add an "already exists" case.
- **Carriers:** the pipeline only sees a carrier through `CarrierAccess` (`pipeline/carrier-access.ts`), built from the client the `CarrierRouter` returns. Integrations live in `src/integrations/<carrier>/` (ADR 0007), in three parts:
  - `<carrier>-client.ts`: extends `ApiClient` (`common/http/`) with one method per endpoint of the carrier's API, named and shaped like the API, returning the raw `ApiResponse`. No retries, no interpretation.
  - `<carrier>.mapper.ts` (and `.schemas.ts`): plain functions from our types to request bodies and from `ApiResponse`s to outcomes.
  - `<carrier>.carrier.ts`: the `CarrierClient` the pipeline uses, composing the client, the mapper and the retry policy.

  To add a carrier, write those and register its `CarrierClient` in `CarriersModule`.
- **Idempotency** is by `external_ref` (= `nro_remito`). Keep the rules in `SOLUCION.md` ("Idempotencia y reintentos") intact:
  - claim a shipment before working on it;
  - treat 409 as delivered;
  - look a reference up before re-POSTing after an ambiguous failure;
  - don't send without a stored payload.
- **Stored values are English enums** that match `prisma/schema.prisma`.

## Database (Prisma 7 + PostgreSQL)

- **Schema and migrations** live in `prisma/`, and the CLI config is `prisma7.config.ts`, which reads `DATABASE_URL` from `.env`. After editing the schema, run `npm run prisma:migrate -- --name <change>`. The generated client goes to `src/generated/prisma/`, which is git-ignored, so run `npm run prisma:generate` after a fresh clone. `npm run build` does that for you.
- **`npm` holds back some packages' install scripts** (`npm install-scripts ls`). Prisma 7 works without them.
- **Only repositories use `PrismaService`.** Import `PrismaModule` in the package's module, and import enums and model types from `src/generated/prisma/client.js`.
- **The `nestjs-data` skill's rules apply:**
  - map unique violations (`P2002`) instead of pre-checking;
  - never call the carrier inside a transaction;
  - page with cursors.
- **Tests:**
  - Unit tests need no database: the pipeline helpers are pure, and services get fakes for their tokens.
  - E2E tests need PostgreSQL (`docker compose up -d postgres`). `test/global-setup.ts` migrates `logisur_test`, and `test/database.ts` truncates it between tests.
  - Replace the carrier with `.overrideProvider(CARRIER_ROUTER)`; never call the real mock from tests.
