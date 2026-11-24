# data

Daily remitos exports from LogiSur's system: the input to this project. Each file is named `remitos_YYYY-MM-DD.json` and is kept exactly as the system produced it.

> **Do not edit `remitos_2026-09-30.json` or any other file in this folder.** That means no reformatting, no fixing values and no removing duplicates. The issues listed below are what the code has to handle, so cleanup belongs in code. To test a specific case, write a separate fixture next to the tests.

| File | Records | Notes |
| --- | --- | --- |
| `remitos_2026-09-30.json` | 51 | Sample export for 2026-09-30. Every record has `fecha_remito` 2026-09-30. |

Docker Compose mounts this folder read-only into the backend at `/data` (`REMITOS_DIR=/data`).

## Format

The file is a UTF-8 JSON array with one object per remito:

```json
{
  "nro_remito": "R-10000459",
  "fecha_remito": "2026-09-30",
  "cliente": "Ferretería Industrial Norte SA",
  "destinatario": {
    "razon_social": "Ferretería El Tornillo",
    "direccion": "Sarmiento 3442",
    "localidad": "Córdoba",
    "provincia": "Córdoba",
    "codigo_postal": "5000",
    "telefono": "1146366340"
  },
  "bultos": 7,
  "peso_kg": 80.6,
  "volumen_m3": 1.11,
  "valor_declarado": 849149.6,
  "transportista": "Cruz del Norte",
  "servicio": "NORMAL",
  "observaciones": ""
}
```

| Field | Meaning |
| --- | --- |
| `nro_remito` | Delivery note number. It should be unique, but isn't always (see below). |
| `fecha_remito` | Date of the delivery note (ISO date). |
| `cliente` | LogiSur's customer, i.e. the sender. |
| `destinatario.*` | Recipient's business name, street address, city, province, postal code and phone. |
| `bultos` | Number of packages (integer). |
| `peso_kg` | Weight in kg. |
| `volumen_m3` | Volume in m³. The carrier API has no field for it. |
| `valor_declarado` | Declared value. |
| `transportista` | Assigned carrier, or `RETIRA CLIENTE` when the customer picks the goods up. |
| `servicio` | `NORMAL` or `URGENTE`. |
| `observaciones` | Free-text notes, usually empty. |

The mapping to the Expreso Andino API is in [`AGENTS.md`](../AGENTS.md#remito--shipment-mapping).

## Known data issues

Found in `remitos_2026-09-30.json`. Assume future exports have the same problems or new ones.

- **Carrier names are inconsistent.** Expreso Andino appears as `EXPRESO ANDINO`, `Expreso Andino`, `EXPRESO ANDINO ` (trailing space), `Exp. Andino` and `expreso andino`. Other values are `Cruz del Norte` / `CRUZ DEL NORTE`, `TRANSPORTE LITORAL` and `RETIRA CLIENTE`.
- **Province names aren't canonical.** You'll see `BA`, `Bs. As.`, `CABA`, `Capital Federal`, `Cba`, `Tucuman`, `Neuquen` and similar. The carrier API only accepts the exact names from `GET /v1/provinces` (for example `Ciudad Autónoma de Buenos Aires` or `Tucumán`).
- **`peso_kg` isn't always a number.** About 40% of the values are strings with a decimal comma, such as `"145,1"`.
- **Delivery note numbers repeat.** `R-10000507` appears more than once.
- **Required data is missing.** For example, one record's `observaciones` says `Cliente no informó CP`: the customer didn't give a postal code.
  - `R-10000477`: `codigo_postal` is `""`, explained by the note above.
  - `R-10000516`: `direccion` is `"  "` (whitespace only), with no note explaining it.
- **Invalid package counts.** `R-10000541` has `bultos: 0`. The carrier API requires `packages` ≥ 1.

All the problem records above (`R-10000477`, `R-10000507`, `R-10000516` and `R-10000541`) are assigned to Expreso Andino, so they reach the load and have to be reported.

### File-level details

- Line endings are Windows CRLF, and there is no BOM. Readers should accept a BOM and either line ending anyway.
- Every record has the same keys, both at the top level and inside `destinatario`. "Missing" values show up as empty or blank strings, never as absent keys or `null`, but code shouldn't rely on that.
- Per carrier: 24 Expreso Andino (including both copies of `R-10000507`), 13 Cruz del Norte, 6 Transporte Litoral and 8 Retira Cliente.
