# Frontend

Vite + React + TypeScript, styled with Tailwind CSS v4 and shadcn/ui (see `docs/adr/0003-frontend-ui-stack-tailwind-and-shadcn.md`).

## Language

- **The UI is in Spanish (es-AR).** Every user-facing string (labels, headings, messages, page title) is written in Spanish, because the app's users and its domain are Spanish-speaking.
- **The code is in English.** Identifiers, file and folder names, comments, types, commit messages and docs are in English. For example, a "Remitos" page would live in `src/pages/delivery-notes-page.tsx` as `DeliveryNotesPage`, while its heading reads "Remitos".

## Layout

| Path | What it is |
| --- | --- |
| `src/components/ui/` | shadcn/ui components. Add more with `npx shadcn@latest add <name>`. |
| `src/components/layout/` | App shell (header, nav, footer). |
| `src/pages/` | One component per page. |
| `src/lib/utils.ts` | `cn()` class-name helper. |
| `src/index.css` | Tailwind entry point and theme tokens. The brand palette is the `--brand-*` variables in `:root`. |

## Commands

```bash
npm run dev      # :5173
npm run build
npm run lint
```
