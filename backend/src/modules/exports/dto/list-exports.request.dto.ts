import { z } from 'zod';
import { PAGE_REQUEST_SCHEMA } from '../../../common/dto/page.request.dto.js';

export const LIST_EXPORTS_REQUEST_SCHEMA = PAGE_REQUEST_SCHEMA.extend({
  uploadedFrom: z.coerce.date().optional(),
  uploadedTo: z.coerce.date().optional(),
});

export type ListExportsRequestDto = z.infer<typeof LIST_EXPORTS_REQUEST_SCHEMA>;
