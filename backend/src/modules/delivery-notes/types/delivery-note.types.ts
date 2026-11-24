import type { Field } from '../../../common/types/field.js';
import type { JsonObject } from '../../../common/types/json.js';
import type { Carrier } from '../../carriers/carrier-registry.js';
import type { Province, Service } from '../schemas/delivery-note.schemas.js';

/** A remito exactly as exported. */
export type RawDeliveryNote = JsonObject;

export interface StoredDeliveryNote {
  id: string;
  exportId: string;
  position: number;
  number?: string;
  carrier?: Carrier;
  raw: RawDeliveryNote;
}

/** A remito after NORMALIZE: every field read, nothing judged yet. */
export interface NormalizedDeliveryNote {
  number: Field<string>;
  carrier: Field<Carrier>;
  recipient: {
    name: Field<string>;
    street: Field<string>;
    city: Field<string>;
    province: Field<Province>;
    postalCode: Field<string>;
    phone: Field<string>;
  };
  packages: Field<number>;
  weightKg: Field<number>;
  declaredValue: Field<number>;
  service: Field<Service>;
}

/** A remito that passed VALIDATE: everything a carrier needs. */
export interface ValidDeliveryNote {
  number: string;
  recipient: {
    name: string;
    street: string;
    city: string;
    province: Province;
    postalCode: string;
    phone?: string;
  };
  packages: number;
  weightKg: number;
  declaredValue?: number;
  service: Service;
}

/** The delivery note fields a carrier can complain about. */
export type DeliveryNoteField =
  | 'number'
  | 'recipientName'
  | 'street'
  | 'city'
  | 'province'
  | 'postalCode'
  | 'phone'
  | 'packages'
  | 'weightKg'
  | 'declaredValue'
  | 'service';
