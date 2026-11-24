# 0007. Generic API client and carrier integration layout

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

`ExpresoAndinoClient` mixed four concerns in one class: the HTTP transport (base URL, API key header, JSON, timeouts), the API's endpoints, reading each answer (which status means delivered, rejected or transient), and the retry and lookup-before-resend policy that makes delivery idempotent (ADR 0005). It was hard to see what the carrier's API looks like from the code, and the transport would have to be rewritten for the next carrier.

Nest has no first-party HTTP client in the version we use. `@nestjs/axios` exists but adds axios for what the platform `fetch` already does.

## Decision

Split an integration into layers:

- **`ApiClient`** (`backend/src/common/http/api-client.ts`): an abstract base over `fetch` with a base URL, default headers, JSON bodies, query strings and a per-request timeout. It returns every answer as an `ApiResponse` (`status`, `ok`, `body`) and rejects only on network errors or timeouts. It never interprets a status.
- **`<Carrier>Client extends ApiClient`**: one method per endpoint of the carrier's API, named and shaped like the API (`listProvinces`, `createShipment`, `searchShipments`, `getShipment` for Expreso Andino). No logic.
- **`<carrier>.mapper.ts` and `<carrier>.schemas.ts`**: plain functions and Zod schemas that build request bodies and turn `ApiResponse`s into outcomes.
- **`<Carrier>Carrier implements CarrierClient`**: what the pipeline uses. It composes the client, the mapper and the `@nestjs/resilience` `RetryPolicy`.

The idempotency rules of ADR 0005 are unchanged; they now live in the carrier adapter.

## Alternatives considered

- **`@nestjs/axios`:** an extra dependency and an Observable API, for no feature we need beyond `fetch`.
- **Keep one class per carrier:** simplest file count, but it hides the API's shape and duplicates the transport per carrier.
- **Have the client throw on non-2xx statuses:** the carrier answers 409 and 422 as meaningful results, so mapping them from exceptions would be more code, not less.

## Consequences

- A new carrier writes a short client listing its endpoints, plus a mapper and an adapter; the transport is reused.
- Tests split the same way: the client spec checks routes, headers and encoding; the carrier spec checks delivery outcomes, retries and idempotency through a scripted `fetch`.
- Endpoints the pipeline doesn't use yet (`getShipment`) are available for shipment tracking.
