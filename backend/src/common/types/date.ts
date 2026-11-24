/** Dates without a time (`YYYY-MM-DD`), as carriers send them and PostgreSQL `date` columns store them (midnight UTC). */

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

/** Midnight UTC of the day `instant` falls on. */
export const startOfUtcDay = (instant: Date): Date =>
  new Date(
    Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate(),
    ),
  );

/** `YYYY-MM-DD` → midnight UTC of that day. */
export const fromIsoDate = (date: string): Date =>
  new Date(`${date}T00:00:00Z`);

/** A date column's value → `YYYY-MM-DD`. */
export const toIsoDate = (date: Date): string =>
  date.toISOString().slice(0, ISO_DATE_LENGTH);
