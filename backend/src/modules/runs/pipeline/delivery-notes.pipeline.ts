import type { CarrierClient } from '../../carriers/carrier-client.js';
import type { Carrier } from '../../carriers/carrier-registry.js';
import type { StoredDeliveryNote } from '../../delivery-notes/types/delivery-note.types.js';
import { carrierAccess } from './carrier-access.js';
import { deliverer } from './deliverer/deliverer.js';
import {
  alreadyDelivered,
  byCarrier,
  composeFilters,
  dedupeWithinExport,
  hasNumber,
  type DeliveredShipment,
  type FilterResult,
} from './filter/filters.js';
import { mapper } from './mapper/mapper.js';
import { normalize } from './normalizer/normalize.js';
import type { Stage } from './stage.js';
import { validator } from './validator/validate.js';

export interface DeliveryNotesPipelineConfig {
  carrier: Carrier;
  client?: CarrierClient;
  /** Shipments already delivered to this carrier, by delivery note number. */
  delivered?: ReadonlyMap<string, DeliveredShipment>;
}

export interface DeliveryNotesPipeline {
  /** NORMALIZE and FILTER over the whole export. */
  select(deliveryNotes: readonly StoredDeliveryNote[]): FilterResult;
  /** VALIDATE → MAP → DELIVER, per delivery note (see `runStages`). */
  stages: readonly Stage[];
}

/**
 * The delivery notes pipeline: which helper does each step, in order.
 *
 *   NORMALIZE  normalizer/  read every delivery note of the export
 *   FILTER     filter/      this carrier, with a number, once, not delivered before
 *   VALIDATE   validator/   everything the carrier requires is there
 *   MAP        mapper/      in the carrier's request format
 *   DELIVER    deliverer/   to the carrier, idempotently
 */
export function deliveryNotesPipeline(
  config: DeliveryNotesPipelineConfig,
): DeliveryNotesPipeline {
  const carrier = carrierAccess(config.carrier, config.client);
  const filter = composeFilters(
    byCarrier(config.carrier),
    hasNumber(),
    dedupeWithinExport(),
    alreadyDelivered(config.delivered ?? new Map()),
  );

  return {
    select: (deliveryNotes) =>
      filter(
        deliveryNotes.map(({ id, position, raw }) => ({
          deliveryNoteId: id,
          position,
          normalized: normalize(raw),
        })),
      ),
    stages: [validator(carrier), mapper(carrier), deliverer(carrier)],
  };
}
