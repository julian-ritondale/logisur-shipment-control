# 0006. Frontend routing, data fetching and UI language

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

[ADR 0003](0003-frontend-ui-stack-tailwind-and-shadcn.md) chose the UI kit but not routing or data fetching, which the screens now need: the control overview, shipments, the delivery note search, exports and runs. It set the UI language to Spanish, while `AGENTS.md` said UI messages are in English and the backend answers English codes and reason messages.

## Decision

- **React Router** (`react-router`, declarative `BrowserRouter`) for pages: `/` (control overview), `/shipments`, `/shipments/:id`, `/search?number=` (results of the header's remito search), `/exports`, `/exports/:id`, `/runs`, `/runs/:id`. Filters that other pages link to (the shipments view) live in the URL.
- **Remito search lives in the header,** on every page (`/` focuses it): a number usually arrives from outside (a call, an email), so it must be one step away from anywhere.
- **"Atrás" returns to where a detail was opened from,** not to the browser's previous entry (which could be another run after a retry). Links into detail pages (`DetailLink`) pass their origin in router state; without one, "Atrás" goes to the parent list.
- **TanStack Query** for server state: caching, loading and error states, and mutations with cache invalidation. A thin typed `fetch` wrapper in `src/lib/api.ts` mirrors the backend DTOs.
- **Numbered pages over the backend's cursors.** Lists show one page at a time with Anterior, page numbers and Siguiente (shadcn `pagination`). `src/lib/use-paged-query.ts` wraps `useQuery` and remembers the `after` cursor of each page reached; the backend gives no total, so the pages shown are the ones visited plus the next. `useInfiniteQuery` was dropped: it is built for "load more".
- **UI language: Spanish (es-AR),** as ADR 0003 says. The backend keeps English codes; the UI translates every code it shows (statuses, steps, causes) in one catalogue, `src/lib/labels.ts`. The backend's English reason message is kept as a tooltip. An unknown code is shown as is.
- **Counts are computed in the browser** for the overview, by paging through `GET /shipments` up to 2,000 items. The backend has no aggregate endpoint, and a day's volume fits well under the cap; the page says when its numbers are partial.
- **One carrier.** The backend serves one carrier per deployment ([ADR 0012](0012-one-carrier-per-deployment-without-routing.md)). The header has a carrier selector hard-coded to Expreso Andino (`src/lib/carrier.ts`), and page titles start with it, in the brand colour ("**Expreso Andino** / Envíos"), so it is always clear whose shipments are on screen. There are no carrier filters; real multi-carrier screens are in the roadmap in `SOLUCION.md`.
- **Status colours are plain** (green, red, amber, blue, grey), apart from the brand palette, which stays for the header and accents.
- **The page scrollbar is always shown** (`overflow-y: scroll` on `html`), so short and long pages line up. Radix's scroll lock adds a compensating right margin while a select is open; it is cancelled in `index.css` because the scrollbar never goes away.
- The Vite dev server proxies `/api` to `http://localhost:3000` stripping the prefix, as nginx does in Docker.

## Alternatives considered

- **Hand-written `fetch` hooks and hash routing:** duplicates caching, retries and pagination state that TanStack Query already provides.
- **React Router data routers or a meta-framework:** more than a small SPA needs.
- **Translating reason messages in the backend:** stored values and their messages are English by convention; a second language belongs to the presentation layer.
- **A backend endpoint for totals:** the right call at scale, but not needed for a day's volume. It's in the roadmap.

## Consequences

- Two runtime dependencies are added: `react-router` and `@tanstack/react-query`.
- Jumping straight to page 5 is not possible until pages 1 to 4 were visited; with a day's volume (a few pages) this is fine. A total count from the backend would allow it.
- A new `Cause` in the backend needs a Spanish label in `src/lib/labels.ts`; until then the UI shows the code.
- Runs and status checks are synchronous on the backend, so the UI shows a pending state during the request instead of polling.
