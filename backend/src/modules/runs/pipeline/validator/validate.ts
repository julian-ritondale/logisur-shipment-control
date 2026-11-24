import { z } from 'zod';
import {
  FieldStatus,
  valueOf,
  type Field,
} from '../../../../common/types/field.js';
import {
  PROVINCES,
  Service,
} from '../../../delivery-notes/schemas/delivery-note.schemas.js';
import type {
  NormalizedDeliveryNote,
  ValidDeliveryNote,
} from '../../../delivery-notes/types/delivery-note.types.js';
import { fromCarrierError, type CarrierAccess } from '../carrier-access.js';
import {
  failure,
  MIN_DECLARED_VALUE,
  MIN_PACKAGES,
  MIN_WEIGHT_KG,
  reason,
} from '../reasons.js';
import type { Stage } from '../stage.js';
import { fail, ok, type Result } from '../types/pipeline.types.js';
import {
  Cause,
  type Reason,
  Step,
} from '../../../../common/types/pipeline.types.js';

/** The reason for an absent value, and for a value that is there but wrong. */
const when = (missing: Cause, wrong: Cause = missing) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? missing : wrong,
});

/** The rules: what a carrier needs, each broken rule named by its cause. */
const rules = (servedProvinces: ReadonlySet<string>) =>
  z.object({
    number: z.string(when(Cause.MISSING_DELIVERY_NOTE_NUMBER)),
    name: z.string(when(Cause.MISSING_RECIPIENT_NAME)),
    street: z.string(when(Cause.MISSING_ADDRESS)),
    city: z.string(when(Cause.MISSING_CITY)),
    province: z
      .enum(PROVINCES, when(Cause.MISSING_PROVINCE, Cause.UNKNOWN_PROVINCE))
      .refine((name) => servedProvinces.has(name), {
        error: Cause.PROVINCE_NOT_SERVED,
      }),
    postalCode: z.string(when(Cause.MISSING_POSTAL_CODE)),
    phone: z.string().optional(),
    packages: z
      .number(when(Cause.MISSING_PACKAGES, Cause.INVALID_PACKAGES))
      .min(MIN_PACKAGES, { error: Cause.TOO_FEW_PACKAGES }),
    weightKg: z
      .number(when(Cause.MISSING_WEIGHT, Cause.INVALID_WEIGHT))
      .gt(MIN_WEIGHT_KG, { error: Cause.NON_POSITIVE_WEIGHT }),
    declaredValue: z
      .number({ error: Cause.INVALID_DECLARED_VALUE })
      .min(MIN_DECLARED_VALUE, { error: Cause.NEGATIVE_DECLARED_VALUE })
      .optional(),
    service: z.enum(
      Service,
      when(Cause.MISSING_SERVICE, Cause.UNKNOWN_SERVICE),
    ),
  });

/** A value NORMALIZE couldn't read: it never passes a rule, but its raw text names the problem. */
class Unreadable {
  constructor(readonly raw: string) {}
}

/** A field as the rules see it: its value, an `Unreadable`, or nothing. */
const input = <T>(field: Field<T>) =>
  field.status === FieldStatus.INVALID
    ? new Unreadable(field.raw)
    : valueOf(field);

const display = (value: unknown) =>
  value instanceof Unreadable
    ? value.raw
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

/** VALIDATE: checks a normalized delivery note against the rules, reporting every problem at once. */
export function validate(
  note: NormalizedDeliveryNote,
  servedProvinces: ReadonlySet<string>,
): Result<ValidDeliveryNote> {
  const { recipient } = note;
  const parsed = rules(servedProvinces).safeParse(
    {
      number: input(note.number),
      name: input(recipient.name),
      street: input(recipient.street),
      city: input(recipient.city),
      province: input(recipient.province),
      postalCode: input(recipient.postalCode),
      phone: valueOf(recipient.phone),
      packages: input(note.packages),
      weightKg: input(note.weightKg),
      declaredValue: input(note.declaredValue),
      service: input(note.service),
    },
    { reportInput: true },
  );

  if (!parsed.success) {
    const issues: Reason[] = parsed.error.issues.map((issue) =>
      reason(issue.message as Cause, { value: display(issue.input) }),
    );
    const message = issues.map((issue) => issue.message).join('; ');
    return fail(
      failure(Step.VALIDATE, { cause: issues[0].cause, message }, { issues }),
    );
  }

  const { name, street, city, province, postalCode, phone, ...rest } =
    parsed.data;
  return ok({
    ...rest,
    recipient: { name, street, city, province, postalCode, phone },
  });
}

/** VALIDATE as a stage, against the provinces the carrier serves. */
export const validator = (
  carrier: CarrierAccess,
): Stage<NormalizedDeliveryNote, ValidDeliveryNote> => ({
  step: Step.VALIDATE,
  run: async (note) => {
    const blocked = carrier.refused(Step.VALIDATE);
    if (blocked) {
      return fail(blocked);
    }
    try {
      return validate(note, await carrier.provinces());
    } catch (error) {
      const why = fromCarrierError(Step.VALIDATE, error);
      if (why.cause === Cause.INVALID_CARRIER_CREDENTIALS) {
        carrier.refuse(why);
      }
      return fail(why);
    }
  },
});
