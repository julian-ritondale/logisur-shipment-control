# 0009. Carrier integrations as a client and a mapper

- **Status:** Accepted. Supersedes the integration layout of [0007](0007-generic-api-client-and-carrier-integration-layout.md); its generic `ApiClient` stays.
- **Date:** 2026-11-24

## Context

ADR 0007 split the Expreso Andino integration into a client (endpoints only), a mapper, a schemas file and a separate `ExpresoAndinoCarrier` adapter holding the retries. For one carrier, that was five source files plus two specs to follow a single delivery, and the adapter mostly forwarded calls to the client.

## Decision

An integration in `backend/src/integrations/<carrier>/` is four files:

- **`<carrier>.client.ts`:** `extends ApiClient implements CarrierClient`. First the `CarrierClient` methods (`provinces`, `toShipmentRequest`, `deliver`) with the `@nestjs/resilience` retry policy and the lookup-before-resend rule of ADR 0005. Then one method per endpoint of the carrier's API, named and shaped like the API, returning the raw `ApiResponse`.
- **`<carrier>.mapper.ts`:** plain functions plus the Zod schemas of the API's bodies: request bodies out, `ApiResponse`s in.
- **`<carrier>.module.ts`** and **`<carrier>.client.spec.ts`**.

`ApiClient` (`backend/src/common/http/`) is unchanged from ADR 0007.

## Alternatives considered

- **Keep ADR 0007's adapter and schemas files:** a cleaner separation on paper, but more files and indirection than one carrier needs.

## Consequences

- One class shows both what the pipeline asks of a carrier and which endpoints answer it.
- The integration has one spec, which covers delivery outcomes, retries, idempotency and the endpoints through a scripted `fetch`.
