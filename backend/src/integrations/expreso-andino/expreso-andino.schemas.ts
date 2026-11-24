import { z } from 'zod';

/** Response bodies of Expreso Andino's API, as `expreso-api/API.md` describes them. */

/** `GET /v1/provinces` → 200. */
export const PROVINCES = z.object({ provinces: z.array(z.string()) });

/** `POST /v1/shipments` → 201, and 409 (duplicate), which carries the existing one. */
export const SHIPMENT = z.object({ tracking_id: z.string() });

/** `POST /v1/shipments` → 422. */
export const VALIDATION_ERROR = z.object({
  details: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .default([]),
});

/** `GET /v1/shipments?external_ref=` → 200. */
export const SEARCH = z.object({
  items: z.array(
    z.object({ tracking_id: z.string(), external_ref: z.string() }),
  ),
});

/** The one field of a `POST /v1/shipments` body we need to read back. */
export const SHIPMENT_REFERENCE = z.object({ external_ref: z.string() });
