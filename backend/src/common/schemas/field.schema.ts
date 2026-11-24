import { z } from 'zod';
import { invalid, MISSING, valid, type Field } from '../types/field.js';
import type { JsonValue } from '../types/json.js';

const WHITESPACE = /\s+/g;
const DOTS = /\./g;
const DIACRITICS = /\p{Diacritic}/gu;

/** Collapses runs of whitespace (including non-breaking spaces) and trims. */
export const collapseWhitespace = (value: string) =>
  value.replace(WHITESPACE, ' ').trim();

/** How aliases are compared: no case, no accents, no dots ("Bs. As." → "bs as"). */
export const lookupKey = (value: string) =>
  collapseWhitespace(
    value.normalize('NFD').replace(DIACRITICS, '').replace(DOTS, ''),
  ).toLowerCase();

/** A whitelist: accepts a string only if its `lookupKey` is in `aliases`, and returns what it maps to. */
export const lookup = <T extends string>(
  aliases: Readonly<Record<string, T>>,
) =>
  z
    .string()
    .transform(lookupKey)
    .refine((key) => Object.hasOwn(aliases, key))
    .transform((key) => aliases[key]);

const isBlank = (raw: JsonValue | undefined) =>
  raw === undefined ||
  raw === null ||
  (typeof raw === 'string' && collapseWhitespace(raw) === '');

const display = (raw: JsonValue) =>
  typeof raw === 'string' ? raw : JSON.stringify(raw);

/** Reads one untrusted value with `schema`: blank is MISSING, a mismatch is INVALID (keeping the raw text). */
export const fieldParser =
  <T>(schema: z.ZodType<T>) =>
  (raw: JsonValue | undefined): Field<T> => {
    if (isBlank(raw)) {
      return MISSING;
    }
    const parsed = schema.safeParse(raw);
    return parsed.success
      ? valid(parsed.data)
      : invalid(display(raw as JsonValue));
  };
