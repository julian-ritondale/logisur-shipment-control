import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Carrier } from '../modules/carriers/carrier-registry.js';

/** The environment the backend needs, checked at startup (see AGENTS.md). */
export const ENVIRONMENT_SCHEMA = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  /** The carrier whose delivery notes this deployment delivers. Only Expreso Andino has an integration. */
  CARRIER: z.enum([Carrier.EXPRESO_ANDINO]).default(Carrier.EXPRESO_ANDINO),
  EXPRESO_API_URL: z.url(),
  EXPRESO_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof ENVIRONMENT_SCHEMA>;

/** The validated environment, typed: `config.get('CARRIER', { infer: true })` is a `Carrier`. */
export type EnvConfig = ConfigService<Env, true>;
