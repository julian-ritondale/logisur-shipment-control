import { z } from 'zod';

export const CREATE_RUN_REQUEST_SCHEMA = z.strictObject({
  /** The uploaded export to run (`POST /exports`). */
  exportId: z.uuidv4(),
});

export type CreateRunRequestDto = z.infer<typeof CREATE_RUN_REQUEST_SCHEMA>;
