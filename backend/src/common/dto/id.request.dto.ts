import { z } from 'zod';

/** An id in a URL: an opaque v4 UUID. Use as `@Param('id', { schema: ID_SCHEMA }) id: string`. */
export const ID_SCHEMA = z.uuidv4();
