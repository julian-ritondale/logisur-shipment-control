# LogiSur Shipment Control

[logisur-demo.webm](https://github.com/user-attachments/assets/66df0d40-d992-4975-804a-e6951b4c573f)


Loads LogiSur's daily delivery notes (*remitos*) into the **Expreso Andino** carrier's shipments API. It picks out the remitos assigned to Expreso Andino, cleans up and validates the data, and creates each shipment exactly once. Transient API failures are retried, and every run reports what was loaded, skipped or rejected.

On top of that bridge, a web app (in Spanish) gives LogiSur's operations team control over their shipments: what wasn't loaded and why, what is late or has an incident at the carrier, and the full history of any remito. **[`SOLUCION.md`](SOLUCION.md)** (Spanish) is the challenge deliverable: the problem chosen and for whom, what was built and left out, assumptions, production changes, how odd data and errors are handled, a run summary and a [demo video](docs/demo/logisur-demo.webm).

## La solución (resumen)

**Problema y para quién.** El puente resuelve el tipeo. El otro problema es el control: hoy operaciones se entera de que un envío no se cargó, de que le faltaba un dato o de que está atrasado cuando llama el cliente. Lo resolvemos para **despacho**, que necesita saber qué no se cargó, por qué y qué hacer, y para **atención al cliente**, que necesita responder "¿qué pasó con el remito R-…?" sin entrar al portal del expreso. Cada remito queda con su historia completa: si se cargó o por qué no, su tracking, la entrega estimada, el servicio y si está atrasado.

**Qué construimos.**
- **Control:** indicadores de cargados, entregados, no cargados, atrasados y con incidencia, y la lista *Requiere atención* ordenada por urgencia. *Actualizar estado* consulta al transportista.
- **Envíos:** filtros por situación (no cargados, cargados, en viaje, con incidencia, atrasados, entregados) y la ficha de cada envío: destinatario, carga, tracking, entrega estimada, historial de corridas y *Reintentar* si falló.
- **Búsqueda** en el encabezado de todas las pantallas: todo sobre un número de remito, también si nunca llegó a ser un envío (otro transportista, retira el cliente, duplicado).
- **Exportaciones y Corridas:** subir y procesar el export, el informe de cada corrida por motivo y el reintento de los fallidos.

**Qué dejamos afuera y por qué.**
- **Varios transportistas.** Solo Expreso Andino tiene API. Los remitos de los demás figuran como omitidos en cada corrida, así que se ve cuántos se siguen cargando a mano.
- **Corregir datos desde la interfaz.** Fue lo más ambiguo. Editar a mano un remito con un formato o valor inválido parece natural, pero no conocemos su origen: no sabemos por qué sistemas pasó ni si ya circuló con el mismo error (factura, etiqueta, lo informado al cliente). Corregirlo recién acá podría dejar el dato bien en el transportista y mal en el resto. Hoy se corrige en el sistema de LogiSur y se vuelve a procesar.
- **Seguimiento automático y alertas.** El estado se consulta a pedido ([ADR 0015](docs/adr/0015-track-loaded-shipments-on-demand.md)).
- **Usuarios y permisos.**

**Cómo seguiría.**
1. **Varios transportistas:** una integración por transportista y el transportista como dato del remito, con filtros y una página por transportista.
2. **Datos para elegir transportista:** cumplimiento de la fecha estimada, incidencias, rechazos, cobertura y costo por envío, por transportista, provincia y servicio. Con eso LogiSur decide a quién asignar cada destino y con quién dejar de trabajar.
3. **Alertas:** seguimiento periódico y aviso a operaciones cuando un envío se atrasa o tiene una incidencia, antes de que llame el cliente.
4. **Corrección de datos:** acordar con LogiSur quién es dueño del dato y dónde corregirlo. Si es acá, con auditoría y aviso al sistema de origen.

Supuestos, cambios para producción, manejo de errores, resumen de una corrida y la demo: [`SOLUCION.md`](SOLUCION.md).

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

The mock keeps its data in memory. Run `docker compose restart expreso-api` to start over with a clean state, and `docker compose down -v` to also wipe the database.

### Trying it

1. Open http://localhost:8080, go to **Exportaciones** and upload `data/remitos_2026-09-30.json`.
2. Press **Procesar para Expreso Andino**. The run report should read 51 remitos: **20 loaded**, **28 skipped** (19 other carriers, 8 customer pickups, 1 duplicate) and **3 failed** (missing postal code, blank address, 0 packages).
3. On **Control**, press **Actualizar estado** to ask the carrier where each shipment is: late shipments and incidents show up in *Requiere atención*.
4. Search any remito number from the header (or press `/`), for example `R-10000459`, assigned to another carrier.
5. Process the same export again: the 20 count as loaded and nothing is sent twice.

## Local development

Requires Node 24 and Python 3.9 or later.

```bash
python expreso-api/expreso_api.py              # mock on 127.0.0.1:8000
cd backend  && npm install && npm run start:dev  # :3000
cd frontend && npm install && npm run dev        # :5173
```

Backend tests: `npm test` (unit) and `npm run test:e2e`, run from `backend/`.

## Docs

- The solution, assumptions, production changes and a run summary (Spanish): [`SOLUCION.md`](SOLUCION.md)
- Demo video (1:27): [`docs/demo/logisur-demo.webm`](docs/demo/logisur-demo.webm)
- API contract for the Expreso Andino mock: [`expreso-api/API.md`](expreso-api/API.md)
- Remitos export format and known data issues: [`data/README.md`](data/README.md)
- Architecture decisions: [`docs/adr/`](docs/adr/README.md)
- Guidance for coding agents: [`AGENTS.md`](AGENTS.md)

## Contributing

Commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The type, scope and breaking-change rules for this repo are in [`AGENTS.md`](AGENTS.md#commit-messages).

## License

[MIT](LICENSE)
