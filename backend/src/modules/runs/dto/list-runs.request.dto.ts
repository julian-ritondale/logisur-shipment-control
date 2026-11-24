import { z } from 'zod';
import { PAGE_REQUEST_SCHEMA } from '../../../common/dto/page.request.dto.js';
import { RunKind, RunStatus } from '../../../generated/prisma/client.js';
import { Carrier } from '../../carriers/carrier-registry.js';

export const LIST_RUNS_REQUEST_SCHEMA = PAGE_REQUEST_SCHEMA.extend({
  status: z.enum(RunStatus).optional(),
  kind: z.enum(RunKind).optional(),
  exportId: z.uuidv4().optional(),
  carrier: z.enum(Carrier).optional(),
});

export type ListRunsRequestDto = z.infer<typeof LIST_RUNS_REQUEST_SCHEMA>;
