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

In this project, `src/main.ts` creates the app and listens on `PORT` (3000 by default), `src/app.module.ts` is the root module that imports the others, and `AppController` and `AppService` are samples. Unit tests sit beside the code as `*.spec.ts` and the e2e test is in `test/`; Vitest runs them (`npm test`, `npm run test:e2e`).

When a task says how to test, follow it. When it says nothing, cover the behaviour you change with focused tests rather than adding broad e2e suites.

## Conventions for features

`src/delivery-notes/` is the reference feature. Follow its shape (decision in `docs/adr/0004-delivery-notes-export-storage.md`):

- **Layers.** The controller handles HTTP only. It turns the request into plain inputs (params, body, uploaded file), makes one service call and wraps the result in a response DTO. Multipart parsing, size limits and "file required" belong to the controller, because they're part of HTTP. The service holds the rules, knows nothing about HTTP (no Express, no multer, no `HttpException`) and takes plain values such as a `Buffer`. That way a CLI, a job or a queue worker can call it too.
- **DTOs.** Name them by direction, one per use case: `*.request.dto.ts` / `XxxRequestDto` for validated input (params, query, body), and `*.response.dto.ts` / `XxxResponseDto` for output, built from the service's result. Keep them in the feature's `dto/` folder.
- **Swappable parts are interfaces injected by token.** A dependency that could have several implementations is a small TypeScript `interface` plus a `Symbol` token, both in the same file. Examples are where data is stored and how input is read or parsed. The service injects it with `@Inject(TOKEN)` and imports the interface with `import type`, never an implementation class. Keep these interfaces to the few methods the service needs.
- **One module per implementation, picked through imports.** Each implementation has its own module that provides and exports the token, for example `LocalFileDeliveryNotesStorageModule` and `JsonDeliveryNotesReaderModule`. The feature module selects them in `imports`, so switching implementations is a one-line change. In tests, use `.overrideProvider(TOKEN)` (for example, storage in a temporary directory).
- **Errors.** Services throw feature errors that extend an `ApplicationError` kind (`NotFoundError` → 404, `UnprocessableContentError` → 422), for example `src/delivery-notes/delivery-notes.errors.ts`. `ApplicationErrorFilter` maps them, so unit tests assert on these classes, not on HTTP exceptions.
- **Ids in URLs are opaque UUIDs**, validated with `@IsUUID('4')` in the request DTO. Don't leak storage details such as file names or extensions into the API.
