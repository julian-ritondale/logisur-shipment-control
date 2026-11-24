# 0003. Frontend UI stack: Tailwind CSS and shadcn/ui

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

The frontend needs a consistent, corporate-looking UI for operations staff: tables of remitos, load-run summaries, status badges, dialogs and toasts. The backend is not built yet, so we want the building blocks in place before the screens. The look must follow LogiSur's brand: a Patagonia palette on white.

## Decision

- **Tailwind CSS v4** through the `@tailwindcss/vite` plugin. No `tailwind.config`; theme tokens live in `src/index.css`.
- **shadcn/ui** (style `radix-nova`, Radix primitives, Lucide icons), configured in `components.json`. Components are copied into `src/components/ui/` and are ours to edit.
- **Path alias** `@/*` → `src/*` (Vite and TypeScript).
- **Brand palette as CSS variables** (`--brand-*` in `:root`, exposed to Tailwind as `brand-*` colors). shadcn's semantic tokens (`--primary`, `--ring`, …) point at them, so re-theming means changing the hex values in one place.
- **UI language:** Spanish (es-AR), matching the domain and its users.
- Initial components: alert, badge, button, card, dialog, dropdown-menu, empty, input, label, progress, scroll-area, select, separator, sheet, skeleton, sonner, spinner, table, tabs, tooltip.

## Alternatives considered

- **MUI / Ant Design:** complete, but heavy and harder to bend to a custom brand.
- **Hand-written CSS:** full control, but slow to build accessible dialogs, selects and menus.

## Consequences

- New components are added with `npx shadcn@latest add <name>` from `frontend/`.
- Generated files in `src/components/ui/` raise a few `only-export-components` lint warnings; they are harmless.
- Light theme only for now. The `.dark` tokens from shadcn are still neutral and need brand values if dark mode is added.
