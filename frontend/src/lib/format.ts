import type { Field } from '@/lib/api'

const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
// Carrier dates are calendar days (`YYYY-MM-DD`): format them in UTC so they don't shift a day.
const day = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' })
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const decimal = new Intl.NumberFormat('es-AR')

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatDay = (isoDate: string) => day.format(new Date(`${isoDate}T00:00:00Z`))
export const formatMoney = (value: number) => money.format(value)
export const formatNumber = (value: number) => decimal.format(value)

/** A normalized field as text: its value, "Falta", or the raw text that couldn't be read. */
export function formatField<T>(field: Field<T> | undefined, show: (value: T) => string = String) {
  if (!field || field.status === 'MISSING') return 'Falta'
  if (field.status === 'INVALID') return `Ilegible: "${field.raw}"`
  return show(field.value)
}
