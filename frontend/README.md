# Frontend

Vite + React + TypeScript, styled with Tailwind CSS v4 and shadcn/ui (see `docs/adr/0003-frontend-ui-stack-tailwind-and-shadcn.md`).

## Language

- **The UI is in Spanish (es-AR).** Every user-facing string (labels, headings, messages, page title) is written in Spanish, because the app's users and its domain are Spanish-speaking.
- **The code is in English.** Identifiers, file and folder names, comments, types, commit messages and docs are in English. For example, a "Remitos" page would live in `src/pages/delivery-notes-page.tsx` as `DeliveryNotesPage`, while its heading reads "Remitos".

## Layout

Routing, data fetching, paging and the UI language are decided in [ADR 0006](../docs/adr/0006-frontend-routing-data-fetching-and-ui-language.md). The screens are described (in Spanish) in [`SOLUCION.md`](../SOLUCION.md#la-solución).

| Path | What it is |
| --- | --- |
| `src/pages/` | One component per page: control overview, shipments and shipment detail, search results, exports, runs. |
| `src/components/` | Shared pieces: tables, status badges, page header (with "Atrás"), pager, filter buttons, remito number with copy button. |
| `src/components/layout/` | App shell: header with the carrier selector, nav and remito search, footer. |
| `src/components/ui/` | shadcn/ui components. Add more with `npx shadcn@latest add <name>`. |
| `src/lib/api.ts` | Typed `fetch` wrapper; its types mirror the backend DTOs. |
| `src/lib/labels.ts` | Spanish labels for every backend code (statuses, steps, causes). A new backend `Cause` needs one here. |
| `src/lib/use-paged-query.ts` | Numbered pages over the backend's cursor paging. |
| `src/lib/carrier.ts` | The carrier the screens show (hard-coded: one per deployment). |
| `src/index.css` | Tailwind entry point and theme tokens. The brand palette is the `--brand-*` variables in `:root`; status colours are plain Tailwind colours. |

## Commands

```bash
npm run dev      # :5173, proxies /api to the backend on :3000
npm run build
npm run lint
```
