import type { JsonObject } from '../../../../common/types/json.js';
import type { ValidDeliveryNote } from '../../../delivery-notes/types/delivery-note.types.js';
import type { CarrierAccess } from '../carrier-access.js';
import type { Stage } from '../stage.js';
import { fail, ok, Step } from '../types/pipeline.types.js';

/** MAP: a valid delivery note in the carrier's request format (owned by its integration). */
export const mapper = (
  carrier: CarrierAccess,
): Stage<ValidDeliveryNote, JsonObject> => ({
  step: Step.MAP,
  run: async (note) => {
    const missing = carrier.missing(Step.MAP);
    return missing
      ? fail(missing)
      : ok(carrier.client!.toShipmentRequest(note));
  },
});
