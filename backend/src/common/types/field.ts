export const FieldStatus = {
  VALID: 'VALID',
  MISSING: 'MISSING',
  INVALID: 'INVALID',
} as const;

/** A value read from untrusted input: understood, absent, or present but not understood. */
export type Field<T> =
  | { status: typeof FieldStatus.VALID; value: T }
  | { status: typeof FieldStatus.MISSING }
  | { status: typeof FieldStatus.INVALID; raw: string };

export const valid = <T>(value: T): Field<T> => ({
  status: FieldStatus.VALID,
  value,
});

export const MISSING = { status: FieldStatus.MISSING } as const;

export const invalid = (raw: string) =>
  ({ status: FieldStatus.INVALID, raw }) as const;

export const valueOf = <T>(field: Field<T>): T | undefined =>
  field.status === FieldStatus.VALID ? field.value : undefined;

export const rawOf = <T>(field: Field<T>): string | undefined =>
  field.status === FieldStatus.INVALID ? field.raw : undefined;
