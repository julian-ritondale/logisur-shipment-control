import { z } from 'zod';
import {
  collapseWhitespace,
  lookup,
  lookupKey,
} from '../../../common/schemas/field.schema.js';

/** A remito as exported: any JSON object. */
export const RAW_DELIVERY_NOTE_SCHEMA = z.record(z.string(), z.json());

const INTEGER_TEXT = /^-?\d+$/;
/** One decimal separator, "." or ",". Thousands separators ("1.234,5") are not guessed. */
const DECIMAL_TEXT = /^-?\d+(?:[.,]\d+)?$/;
const DECIMAL_COMMA = ',';

export const TEXT_SCHEMA = z.union([
  z.string().transform(collapseWhitespace),
  z.number().transform(String),
]);

export const INTEGER_SCHEMA = z.union([
  z.number().int(),
  z.string().trim().regex(INTEGER_TEXT).transform(Number),
]);

export const DECIMAL_SCHEMA = z.union([
  z.number(),
  z
    .string()
    .trim()
    .regex(DECIMAL_TEXT)
    .transform((value) => Number(value.replace(DECIMAL_COMMA, '.'))),
]);

export const Service = { STANDARD: 'STANDARD', EXPRESS: 'EXPRESS' } as const;
export type Service = (typeof Service)[keyof typeof Service];

export const SERVICE_SCHEMA = lookup<Service>({
  normal: Service.STANDARD,
  urgente: Service.EXPRESS,
});

/** Argentina's 23 provinces plus the autonomous city, as carriers spell them. */
export const PROVINCES = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export type Province = (typeof PROVINCES)[number];

/** Abbreviations and old names seen in exports, besides each province's own name. */
const PROVINCE_ABBREVIATIONS: Record<string, Province> = {
  ba: 'Buenos Aires',
  'bs as': 'Buenos Aires',
  bsas: 'Buenos Aires',
  pba: 'Buenos Aires',
  'pcia de buenos aires': 'Buenos Aires',
  'provincia de buenos aires': 'Buenos Aires',
  caba: 'Ciudad Autónoma de Buenos Aires',
  'capital federal': 'Ciudad Autónoma de Buenos Aires',
  'cap fed': 'Ciudad Autónoma de Buenos Aires',
  'ciudad de buenos aires': 'Ciudad Autónoma de Buenos Aires',
  cba: 'Córdoba',
  tdf: 'Tierra del Fuego',
  'stgo del estero': 'Santiago del Estero',
};

export const PROVINCE_SCHEMA = lookup<Province>({
  ...Object.fromEntries(PROVINCES.map((name) => [lookupKey(name), name])),
  ...PROVINCE_ABBREVIATIONS,
});
