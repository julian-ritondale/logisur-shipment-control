# Solución: control de envíos de LogiSur

Entrega del challenge *Caso Expreso*: el puente que carga los remitos de LogiSur en la API de Expreso Andino (Parte 1) y la interfaz con la que operaciones controla sus envíos (Parte 2).

Decisiones técnicas en [`docs/adr/`](docs/adr/README.md), en particular [0005](docs/adr/0005-functional-pipeline-persistence-and-idempotent-delivery.md) (el puente) y [0006](docs/adr/0006-frontend-routing-data-fetching-and-ui-language.md) (la interfaz).

## Cómo correrlo

Requiere Docker.

```bash
docker compose up --build
```

Levanta PostgreSQL, la API de prueba de Expreso Andino (:8000), el backend (:3000) y la interfaz en **http://localhost:8080**.

1. En **Exportaciones**, subir `data/remitos_2026-09-30.json` y tocar **Procesar para Expreso Andino**.
2. En **Control**, tocar **Actualizar estado** para consultar al transportista dónde está cada envío.
3. Buscar cualquier remito desde el encabezado (tecla `/`), por ejemplo `R-10000459`.

Para empezar de cero: `docker compose down -v` (borra la base) y `docker compose up`.

## Demo

[Video de la demo (1:27)](docs/demo/logisur-demo.webm): subir la exportación, procesarla, ver los fallidos y su motivo, actualizar el estado, filtrar envíos, buscar un remito y volver a procesar sin duplicar.

## La solución

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

## Resumen de una corrida

Con `data/remitos_2026-09-30.json` contra la API de prueba recién iniciada (`GET /runs/:id`):

| Resultado | Paso | Motivo | Cantidad |
| --- | --- | --- | ---: |
| Cargado | DELIVER | | 20 |
| Omitido | FILTER | Asignado a otro transportista (`OTHER_CARRIER`) | 19 |
| Omitido | FILTER | Retira el cliente (`CUSTOMER_PICKUP`) | 8 |
| Omitido | FILTER | Duplicado en la exportación (`DUPLICATE_IN_EXPORT`) | 1 |
| Fallido | VALIDATE | Falta el código postal (`MISSING_POSTAL_CODE`): R-10000477 | 1 |
| Fallido | VALIDATE | Falta la dirección (`MISSING_ADDRESS`): R-10000516 | 1 |
| Fallido | VALIDATE | Cantidad de bultos inválida (`TOO_FEW_PACKAGES`): R-10000541 | 1 |
| **Total** | | | **51** |

Si se vuelve a procesar la misma exportación, los 20 cuentan como cargados (el sistema ya los tiene) y no se envía nada de nuevo.

## Casos raros y errores

**Datos del export** (detalle en [`data/README.md`](data/README.md)):
- **Transportista escrito de varias formas** (`EXPRESO ANDINO `, `Exp. Andino`, `expreso andino`): se compara sin mayúsculas, acentos, puntos ni espacios de más contra una lista de alias. Un transportista desconocido falla con motivo; no se adivina.
- **Provincias abreviadas** (`BA`, `Bs. As.`, `Cba`, `Tucuman`): se llevan al nombre oficial con una lista fija y se validan contra `GET /v1/provinces`.
- **Peso con coma decimal** (`"145,1"`): se lee como 145.1. No se adivinan separadores de miles.
- **Remitos repetidos:** copias idénticas se envían una vez y el resto queda omitido; con datos distintos, fallan todas.
- **Datos faltantes o inválidos** (código postal vacío, dirección en blanco, 0 bultos): el remito falla con todos sus problemas juntos. Nunca se descarta en silencio ni se inventa un valor.

**Respuestas de la API:**
- `201` creado o `409` duplicado: cargado, con su tracking.
- `422`: fallido con el campo que rechazó el transportista.
- `500`, `503` o timeout: hasta 4 intentos con backoff. Antes de reenviar se busca el envío por `external_ref`, porque un `500` no garantiza que no se haya creado.
- `401`: la corrida deja de llamar al transportista y los envíos quedan fallidos con motivo.

**Idempotencia:** `nro_remito` es el `external_ref`. Antes de llamar a la API se revisa la base: si el remito ya está cargado con los mismos datos, cuenta como cargado; si llega con datos distintos, se informa. Dos reintentos simultáneos no procesan el mismo envío. Todo fallido se puede reintentar desde el paso en que falló.

## Supuestos

- **Solo se cargan los remitos de Expreso Andino.** Los de otros transportistas y los que retira el cliente se registran como omitidos con su motivo.
- **`nro_remito` es la referencia única** (`external_ref`) del envío en el transportista.
- **Los datos que faltan no se completan.** Teléfono y valor declarado son opcionales para la API; si faltan, no se envían. Lo obligatorio que falta hace fallar el remito.
- **`servicio`**: `NORMAL` → `standard`, `URGENTE` → `express`. `volumen_m3` y `observaciones` no tienen campo en la API y no se envían.
- **Atrasado** es un envío cuya fecha estimada de entrega ya pasó (día UTC) y que el transportista no entregó.
- **Una corrida por vez**, procesada de forma sincrónica, con una sola instancia del backend.
- **El export llega subido a mano** desde la interfaz; no se lee de una carpeta.

## Qué cambiaría para producción

- **Procesamiento asíncrono:** `POST /runs` respondería `202` y una cola (BullMQ) procesaría los envíos con workers, concurrencia limitada por transportista y reintentos. Hoy un export grande o un transportista lento puede cortar el request por timeout.
- **Jobs programados:** tomar la exportación del día de una carpeta, SFTP o bucket, procesarla de madrugada y consultar el estado de los envíos periódicamente, con alertas.
- **Migraciones de base de datos** en vez de `prisma db push` ([ADR 0011](docs/adr/0011-no-database-migrations-until-the-schema-settles.md)).
- **Usuarios, permisos y auditoría.**
- **Secretos fuera del código** (la API key viene hoy de variables de entorno con un valor por defecto), logs estructurados, métricas y alertas cuando una corrida termina con fallos o el transportista no responde.
- **Endpoint de totales** en el backend para los indicadores del Control, en vez de calcularlos en el navegador.
- **Varias instancias del backend:** hoy, al reiniciar, una corrida a medias se marca fallida; con varias instancias haría falta un lock o una cola para no pisar a otra que sigue trabajando.

## API

Todo listado es paginado por cursor (`?after=<último id>&limit=20`, máximo 100) y devuelve `{ items, nextCursor }`.

| Método y ruta | Qué hace |
| --- | --- |
| `POST /exports` | Sube una exportación (multipart, campo `file`). |
| `GET /exports`, `GET /exports/:id`, `GET /exports/:id/content` | Exportaciones y el archivo original. |
| `GET /delivery-notes`, `GET /delivery-notes/:id` | Remitos tal cual se exportaron. Filtros: `exportId`, `number`, `carrier`. |
| `POST /runs` | Procesa una exportación: `{ "exportId": "…" }`. |
| `POST /runs/:id/retries` | Nueva corrida con los fallidos de la corrida `:id`. |
| `GET /runs`, `GET /runs/:id` | Corridas, con totales y desglose por motivo. |
| `GET /attempts` | Qué le pasó a cada remito en cada corrida. Filtros: `runId`, `shipmentId`, `outcome`, `step`, `cause`, `deliveryNoteNumber`. |
| `GET /shipments`, `GET /shipments/:id` | Envíos, con estado en el transportista y `late`. Filtros: `status`, `deliveryNoteNumber`, `cause`, `carrierStatus`, `late`. |
| `POST /shipments/status-checks` | Consulta al transportista el estado de cada envío cargado y no entregado. |
| `POST /shipments/:id/retries` | Reintenta un envío fallido. |

Errores: `400` datos inválidos, `404` recurso inexistente, `409` nada para reintentar, `413` archivo de más de 5 MB, `422` archivo que no es una exportación legible.
