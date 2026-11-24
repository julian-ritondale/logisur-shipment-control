import { z } from 'zod';
import { Carrier } from '../modules/carriers/carrier-registry.js';

/** The environment the backend needs, checked at startup (see AGENTS.md). */
export const ENVIRONMENT_SCHEMA = z.object({
  DATABASE_URL: z.string().min(1),
  /** The carrier whose delivery notes this deployment delivers. Only Expreso Andino has an integration. */
  CARRIER: z.enum([Carrier.EXPRESO_ANDINO]).default(Carrier.EXPRESO_ANDINO),
  EXPRESO_API_URL: z.url(),
  EXPRESO_API_KEY: z.string().min(1),
});
