import type { JsonObject } from '../../../common/types/json.js';
import type { DeliveryNoteField } from '../../delivery-notes/types/delivery-note.types.js';
import type {
  Cause,
  Reason,
  Step,
} from '../../../common/types/pipeline.types.js';
import type { Failure } from './types/pipeline.types.js';

export const MIN_PACKAGES = 1;
export const MIN_WEIGHT_KG = 0;
export const MIN_DECLARED_VALUE = 0;

export interface ReasonParams {
  value?: string;
  carrier?: string;
  count?: number;
}

/** The message LogiSur reads for each cause. */
const MESSAGES: Record<Cause, (params: ReasonParams) => string> = {
  // FILTER: not for this run
  OTHER_CARRIER: ({ carrier }: ReasonParams) =>
    `Assigned to another carrier (${carrier})`,
  CUSTOMER_PICKUP: () => 'Picked up by the customer; nothing to ship',
  DUPLICATE_IN_EXPORT: ({ value, count }: ReasonParams) =>
    `Delivery note ${value} appears ${count} times in the export with the same data; it is sent once`,
  IN_PROGRESS_ELSEWHERE: () => 'Already being processed by another run',
  // FILTER: someone has to look at it
  MISSING_CARRIER: () => 'The delivery note has no carrier assigned',
  UNKNOWN_CARRIER: ({ value }: ReasonParams) =>
    `Unrecognized carrier "${value}"; check the delivery note`,
  MISSING_DELIVERY_NOTE_NUMBER: () => 'The delivery note has no number',
  CONFLICTING_DUPLICATE: ({ value, count }: ReasonParams) =>
    `Delivery note ${value} appears ${count} times in the export with different data; it can't be told which one is right`,
  LOADED_WITH_DIFFERENT_DATA: ({ value }: ReasonParams) =>
    `Already loaded into the carrier (tracking ${value}), but this export has different data; correct it with the carrier`,
  // VALIDATE
  MISSING_RECIPIENT_NAME: () => 'Recipient name is missing',
  MISSING_ADDRESS: () => 'Recipient address is missing',
  MISSING_CITY: () => 'Recipient city is missing',
  MISSING_PROVINCE: () => 'Recipient province is missing',
  UNKNOWN_PROVINCE: ({ value }: ReasonParams) =>
    `Province "${value}" is not recognized`,
  PROVINCE_NOT_SERVED: ({ value }: ReasonParams) =>
    `The carrier doesn't deliver to ${value}`,
  MISSING_POSTAL_CODE: () => 'Postal code is missing',
  MISSING_PACKAGES: () => 'Number of packages is missing',
  INVALID_PACKAGES: ({ value }: ReasonParams) =>
    `Number of packages "${value}" is not a whole number`,
  TOO_FEW_PACKAGES: ({ value }: ReasonParams) =>
    `Must have at least ${MIN_PACKAGES} package (has ${value})`,
  MISSING_WEIGHT: () => 'Weight is missing',
  INVALID_WEIGHT: ({ value }: ReasonParams) =>
    `Weight "${value}" is not a number`,
  NON_POSITIVE_WEIGHT: ({ value }: ReasonParams) =>
    `Weight must be greater than ${MIN_WEIGHT_KG} kg (is ${value})`,
  INVALID_DECLARED_VALUE: ({ value }: ReasonParams) =>
    `Declared value "${value}" is not a number`,
  NEGATIVE_DECLARED_VALUE: ({ value }: ReasonParams) =>
    `Declared value can't be negative (is ${value})`,
  MISSING_SERVICE: () => 'Service (NORMAL or URGENTE) is missing',
  UNKNOWN_SERVICE: ({ value }: ReasonParams) =>
    `Service "${value}" is unknown (expected NORMAL or URGENTE)`,
  // The carrier side
  REJECTED_BY_CARRIER: ({ value }: ReasonParams) =>
    `The carrier rejected the shipment (${value})`,
  CARRIER_UNAVAILABLE: () =>
    "The carrier's service is not responding; retry later",
  INVALID_CARRIER_CREDENTIALS: () =>
    'The carrier refused our credentials; check the integration settings and retry',
  // Anything else
  INTERNAL_ERROR: () =>
    'Unexpected error while processing; retry it, and contact support if it keeps failing',
};

export const reason = (cause: Cause, params: ReasonParams = {}): Reason => ({
  cause,
  message: MESSAGES[cause](params),
});

export const failure = (
  step: Step,
  { cause, message }: Reason,
  extra: { issues?: Reason[]; detail?: JsonObject } = {},
): Failure => ({ step, cause, message, ...extra });

/** Business names of our fields, used when a carrier rejects one. */
export const FIELD_LABELS: Record<DeliveryNoteField, string> = {
  number: 'delivery note number',
  recipientName: 'recipient name',
  street: 'address',
  city: 'city',
  province: 'province',
  postalCode: 'postal code',
  phone: 'phone',
  packages: 'number of packages',
  weightKg: 'weight',
  declaredValue: 'declared value',
  service: 'service',
};
