import { fieldParser, lookup } from '../../common/schemas/field.schema.js';

export const Carrier = {
  EXPRESO_ANDINO: 'EXPRESO_ANDINO',
  CRUZ_DEL_NORTE: 'CRUZ_DEL_NORTE',
  TRANSPORTE_LITORAL: 'TRANSPORTE_LITORAL',
  CUSTOMER_PICKUP: 'CUSTOMER_PICKUP',
} as const;

export type Carrier = (typeof Carrier)[keyof typeof Carrier];

/** Every carrier LogiSur's exports name, and the spellings accepted for it (compared by `lookupKey`). */
const CARRIERS: Record<Carrier, { name: string; aliases: readonly string[] }> =
  {
    EXPRESO_ANDINO: {
      name: 'Expreso Andino',
      aliases: ['expreso andino', 'exp andino', 'expandino'],
    },
    CRUZ_DEL_NORTE: { name: 'Cruz del Norte', aliases: ['cruz del norte'] },
    TRANSPORTE_LITORAL: {
      name: 'Transporte Litoral',
      aliases: ['transporte litoral'],
    },
    CUSTOMER_PICKUP: { name: 'Customer pickup', aliases: ['retira cliente'] },
  };

const CARRIER_IDS = Object.keys(CARRIERS) as Carrier[];

const CARRIER_BY_ALIAS = Object.fromEntries(
  CARRIER_IDS.flatMap((carrier) =>
    CARRIERS[carrier].aliases.map((alias) => [alias, carrier]),
  ),
);

/** `transportista` → carrier, accepting only the spellings above. */
export const resolveCarrier = fieldParser(lookup<Carrier>(CARRIER_BY_ALIAS));

export const isCarrier = (value: string): value is Carrier =>
  Object.hasOwn(CARRIERS, value);

export const carrierName = (carrier: Carrier) => CARRIERS[carrier].name;
