# 0012. One carrier per deployment, without routing

- **Status:** Accepted. Supersedes the carrier routing of [0005](0005-functional-pipeline-persistence-and-idempotent-delivery.md) (`CarrierRouter`, `CARRIER_ROUTER`, `NO_CARRIER_INTEGRATION`).
- **Date:** 2026-11-24

## Context

The backend routed each run to a carrier's client through a `CarrierRouter` built in a `CarriersModule`. `CARRIER` could name any carrier in the export, and those without an integration made every remito fail as `NO_CARRIER_INTEGRATION`. Only Expreso Andino has an integration, and the brief only asks for Expreso Andino. The routing added a module, a token, a "missing integration" check in every pipeline stage and a failure cause, and none of it could deliver anything.

## Decision

- **The carrier is configuration.** `CARRIER` accepts only `EXPRESO_ANDINO`, which is also the default. It decides which remitos a run keeps, and it is recorded on runs and shipments.
- **No routing.** `ExpresoAndinoModule` provides its client as `CARRIER_CLIENT`, a token next to the `CarrierClient` contract. `RunsService` injects it, and e2e tests override it with a fake. `CarrierRouter`, `CarriersModule` and `NO_CARRIER_INTEGRATION` are removed.
- **The carrier registry stays** (`carriers/carrier-registry.ts`): it recognizes how the export spells each carrier, which the filter needs to skip other carriers and customer pickups.

## Alternatives considered

- **Keep the router for future carriers:** it can be brought back when a second integration exists. Until then it is unused flexibility.
- **Inject `ExpresoAndinoClient` directly:** simpler still, but it couples `RunsService` and its tests to one integration's class instead of the `CarrierClient` contract.

## Consequences

- Fewer moving parts. A run can't be configured for a carrier it can't deliver to.
- Delivering to several carriers would need routing again (the "Multi-transportista" roadmap in `SOLUCION.md`).
