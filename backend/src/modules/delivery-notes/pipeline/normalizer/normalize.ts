import { fieldParser } from '../../../../common/schemas/field.schema.js';
import { resolveCarrier } from '../../../carriers/carrier-registry.js';
import {
  DECIMAL_SCHEMA,
  INTEGER_SCHEMA,
  PROVINCE_SCHEMA,
  RAW_DELIVERY_NOTE_SCHEMA,
  SERVICE_SCHEMA,
  TEXT_SCHEMA,
} from '../../schemas/delivery-note.schemas.js';
import type {
  NormalizedDeliveryNote,
  RawDeliveryNote,
} from '../../types/delivery-note.types.js';

const text = fieldParser(TEXT_SCHEMA);
const integer = fieldParser(INTEGER_SCHEMA);
const decimal = fieldParser(DECIMAL_SCHEMA);
const province = fieldParser(PROVINCE_SCHEMA);
const service = fieldParser(SERVICE_SCHEMA);

/** NORMALIZE: reads every field LogiSur exports. Never fails; VALIDATE judges the result. */
export function normalize(raw: RawDeliveryNote): NormalizedDeliveryNote {
  const recipient =
    RAW_DELIVERY_NOTE_SCHEMA.safeParse(raw.destinatario).data ?? {};
  return {
    number: text(raw.nro_remito),
    carrier: resolveCarrier(raw.transportista),
    recipient: {
      name: text(recipient.razon_social),
      street: text(recipient.direccion),
      city: text(recipient.localidad),
      province: province(recipient.provincia),
      postalCode: text(recipient.codigo_postal),
      phone: text(recipient.telefono),
    },
    packages: integer(raw.bultos),
    weightKg: decimal(raw.peso_kg),
    declaredValue: decimal(raw.valor_declarado),
    service: service(raw.servicio),
  };
}
