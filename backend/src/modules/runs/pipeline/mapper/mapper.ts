import type { JsonObject } from '../../../../common/types/json.js';
import type { ValidDeliveryNote } from '../../../delivery-notes/types/delivery-note.types.js';
import type { CarrierAccess } from '../carrier-access.js';
import type { Stage } from '../stage.js';
import { ok } from '../types/pipeline.types.js';
import { Step } from '../../../../common/types/pipeline.types.js';

/** MAP: a valid delivery note in the carrier's request format (owned by its integration). */
export const mapper = (
  carrier: CarrierAccess,
): Stage<ValidDeliveryNote, JsonObject> => ({
  step: Step.MAP,
  run: async (note) => ok(carrier.client.toShipmentRequest(note)),
});
