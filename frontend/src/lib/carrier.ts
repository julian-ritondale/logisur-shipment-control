/**
 * The carrier these screens show, for the header's selector and the breadcrumbs.
 * Hard-coded: the backend serves one carrier per deployment (backend ADR 0012); choosing
 * among several is in the roadmap in SOLUCION.md.
 */
export const CARRIER = { id: 'EXPRESO_ANDINO', name: 'Expreso Andino' } as const
