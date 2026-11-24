# logisur-shipment-control

Loads LogiSur's daily delivery notes (*remitos*) into the **Expreso Andino** carrier's shipments API. It picks out the remitos assigned to Expreso Andino, cleans up and validates the data, and creates each shipment exactly once. Transient API failures are retried, and every run reports what was loaded, skipped or rejected.

## Structure

```
.
├── backend/                  NestJS API (ESM, Vitest)
├── frontend/                 Vite + React + TypeScript UI
├── expreso-api/              Mock of the Expreso Andino API (read-only)
│   ├── API.md                API contract
│   └── expreso_api.py        Python stdlib server, in-memory state
├── data/                     Daily remitos exports (input), see data/README.md
├── docs/adr/                 Architecture Decision Records
├── docker-compose.yml
└── AGENTS.md / CLAUDE.md     Guidance for coding agents
```

## Running everything

Requires Docker.

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:8080 (`/api/*` is proxied to the backend) |
| Backend | http://localhost:3000 |
| Expreso Andino mock | http://localhost:8000 (header `X-Api-Key: andino-test-7f3a91`) |

The mock keeps its data in memory. Run `docker compose restart expreso-api` to start over with a clean state.

## Local development

Requires Node 24 and Python 3.9 or later.

```bash
python expreso-api/expreso_api.py              # mock on 127.0.0.1:8000
cd backend  && npm install && npm run start:dev  # :3000
cd frontend && npm install && npm run dev        # :5173
```

Backend tests: `npm test` (unit) and `npm run test:e2e`, run from `backend/`.

## Docs

- API contract for the Expreso Andino mock: [`expreso-api/API.md`](expreso-api/API.md)
- Remitos export format and known data issues: [`data/README.md`](data/README.md)
- Architecture decisions: [`docs/adr/`](docs/adr/README.md)
- Guidance for coding agents: [`AGENTS.md`](AGENTS.md)

## Contributing

Commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The type, scope and breaking-change rules for this repo are in [`AGENTS.md`](AGENTS.md#commit-messages).

## License

[MIT](LICENSE)
