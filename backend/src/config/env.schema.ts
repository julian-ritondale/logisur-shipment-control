import { z } from 'zod';
import {
  Carrier,
  DELIVERABLE_CARRIERS,
} from '../modules/carriers/carrier-registry.js';

/** The environment the backend needs, checked at startup (see AGENTS.md). */
export const ENVIRONMENT_SCHEMA = z.object({
  DATABASE_URL: z.string().min(1),
  CARRIER: z.enum(DELIVERABLE_CARRIERS).default(Carrier.EXPRESO_ANDINO),
  EXPRESO_API_URL: z.url(),
  EXPRESO_API_KEY: z.string().min(1),
});
