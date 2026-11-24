import type { Cause, Reason } from '../common/types/pipeline.types.js';
import type { JsonObject } from '../common/types/json.js';
import type {
  NormalizedDeliveryNote,
  RawDeliveryNote,
} from '../modules/delivery-notes/types/delivery-note.types.js';

/**
 * Types of the columns marked `/// [Type]` in `prisma/schema.prisma`, read by
 * `prisma-json-types-generator`: Prisma returns these instead of `JsonValue`
 * (or `string` for `cause`), so repositories don't cast what they read back.
 * Every value is written by our own code, so the types hold.
 */
declare global {
  namespace PrismaJson {
    type RawDeliveryNote = RawDeliveryNoteType;
    type NormalizedDeliveryNote = NormalizedDeliveryNoteType;
    /** The carrier's request body, from MAP. */
    type ShipmentRequest = JsonObject;
    type Issues = Reason[];
    type TechnicalDetail = JsonObject;
    type Cause = CauseType;
  }
}

type RawDeliveryNoteType = RawDeliveryNote;
type NormalizedDeliveryNoteType = NormalizedDeliveryNote;
type CauseType = Cause;
