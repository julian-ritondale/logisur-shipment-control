# AGENTS.md

Guidance for coding agents working in this repository.

## Purpose

LogiSur exports its daily delivery notes (*remitos*) as JSON. This system takes that export, keeps the remitos assigned to the carrier **Expreso Andino**, normalizes and validates them, and loads them into Expreso Andino's shipments API reliably: no duplicates, retries on transient failures, and a clear report of what was loaded, skipped or rejected. Domain docs and data are in Spanish.

## Repository layout

| Path | What it is |
| --- | --- |
| `backend/` | NestJS app (ESM, Vitest, oxlint). It has its own `AGENTS.md` with NestJS-specific guidance; read it when working there. |
| `frontend/` | Vite + React + TypeScript app. |
| `expreso-api/` | Stdlib-only Python mock of the Expreso Andino API (`expreso_api.py`) plus its contract (`API.md`). **Read-only**, see below. |
| `data/` | Daily remitos exports (`remitos_YYYY-MM-DD.json`). These are input fixtures, so don't edit them. Format and known data issues are in `data/README.md`. |
| `docs/adr/` | Architecture Decision Records. |
| `docker-compose.yml` | Runs the mock API, backend and frontend together. |

## Hard rules

- **Never modify anything in `expreso-api/`.** It stands in for a third-party service we don't own. Work around its behaviour from the outside, as `docker-compose.yml` does to bind it to `0.0.0.0`.
- **Never edit `data/remitos_2026-09-30.json`** or any other export in `data/`. Don't reformat, fix, sort or remove duplicates in it. Its inconsistencies are deliberate test input, and all cleanup belongs in code. Write fixtures you need for tests next to the tests instead.
- **`expreso-api/API.md` is the API spec.** Build against it and treat the mock as a black box. Don't read `expreso_api.py` to find out which requests fail, and never special-case specific `external_ref` values. Failure handling has to be generic.
- **Record significant decisions as ADRs** in `docs/adr/` (see `docs/adr/README.md`). If a change contradicts an accepted ADR, write a new ADR that supersedes it instead of editing the old one.

## Commit messages

Every commit follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The spec is the authority; the rules that matter day to day are:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **Type is required.**
  - `feat` adds a feature (a SemVer MINOR change).
  - `fix` fixes a bug (a SemVer PATCH change).
  - Other types are allowed. Use the ones the spec's summary recommends: `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`.
- **Scope is optional.** It's a noun in parentheses naming a part of the codebase. In this repo use `backend`, `frontend`, `docker`, `data`, `adr` or `deps`, for example `feat(backend): ...`.
- **Description:** a short summary right after `: `. Write it in the imperative mood ("add", not "added"), with no trailing period.
- **Body (optional):** free-form, after one blank line. Use it for the *why*.
- **Footers (optional):** after one blank line. Each is `Token: value` or `Token #value`, with hyphens instead of spaces in the token (for example `Refs: #12` or `Reviewed-by: ...`).
- **Breaking changes** must be flagged, either with `!` before the colon (`feat(backend)!: ...`) or with a `BREAKING CHANGE: <description>` footer. That footer token must be uppercase, and `BREAKING-CHANGE` is equivalent. A breaking change is a SemVer MAJOR change, whatever the type.
- **One logical change per commit.** If a change needs two types, split it into two commits.

## Commands

```bash
# Everything (mock :8000, backend :3000, frontend :8080 with /api -> backend)
docker compose up --build
docker compose restart expreso-api      # wipe the mock's in-memory state

# Backend (cd backend)
npm run start:dev
npm test                                # Vitest unit tests (*.spec.ts beside the code)
npx vitest run src/app.controller.spec.ts   # single test file
npx vitest run -t "returns Hello"       # tests matching a name
npm run test:e2e
npm run lint

# Frontend (cd frontend)
npm run dev                             # :5173
npm run build
npm run lint

# Mock API without Docker
python expreso-api/expreso_api.py [port]    # listens on 127.0.0.1:8000
```

On this Windows machine use `python`, not `python3`. The npm shipped with Node 24.14 (11.5.2) crashes with `Cannot read properties of null (reading 'edgesOut')` when installing in `backend/`. Use `npx npm@latest install` there, or upgrade Node to 24.15 or later.

## Runtime wiring

Docker Compose gives the backend these environment variables:

- `EXPRESO_API_URL`: `http://expreso-api:8000`
- `EXPRESO_API_KEY`: defaults to the mock's key `andino-test-7f3a91`
- `REMITOS_DIR=/data`: the repo's `data/` folder is mounted read-only at `/data`. When running the backend on the host, point `REMITOS_DIR` at `../data`.

Nothing reads these variables yet. Use the same names when you wire up config. The frontend calls the backend through `/api/*`; nginx removes the `/api` prefix, so `/api/foo` reaches `backend:3000/foo`.

## Expreso Andino API essentials (full detail in `expreso-api/API.md`)

- Every request needs the header `X-Api-Key`.
- `POST /v1/shipments` with a unique `external_ref`. The other endpoints:
  - `GET /v1/shipments?external_ref=` looks a shipment up by reference.
  - `GET /v1/shipments/{tracking_id}` returns its status.
  - `GET /v1/provinces` lists the valid provinces.
- Responses:
  - `201` created
  - `409 duplicate`: the body includes the existing `tracking_id`
  - `422` validation error, with per-field `details`
  - `500`/`503`: retryable
- A `500` doesn't prove the shipment wasn't created. Look it up by `external_ref` before retrying, so that re-runs and retries are idempotent.
- `recipient.province` must exactly match one of the values from `/v1/provinces`.

## Remito → shipment mapping

| Remito field | API field |
| --- | --- |
| `nro_remito` | `external_ref` |
| `destinatario.razon_social` | `recipient.name` |
| `destinatario.direccion` | `recipient.street` |
| `destinatario.localidad` | `recipient.city` |
| `destinatario.provincia` | `recipient.province` |
| `destinatario.codigo_postal` | `recipient.zip_code` |
| `destinatario.telefono` | `recipient.phone` |
| `bultos` | `packages` |
| `peso_kg` | `weight_kg` |
| `valor_declarado` | `declared_value` |
| `servicio`: `NORMAL` / `URGENTE` | `service`: `standard` / `express` |

The export is dirty: carrier names, provinces and weights come in inconsistent formats, and there are duplicates and missing fields. `data/README.md` lists the known issues; read it before writing any parsing or normalization code. If a record can't be fixed with confidence, report it. Don't drop it silently and don't guess.
