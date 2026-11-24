import { CarrierStatus, type Shipment } from '../../generated/prisma/client.js';
import { isLate } from './shipments.mapper.js';

const shipment = (
  estimatedDelivery: string | null,
  carrierStatus: CarrierStatus | null = CarrierStatus.IN_TRANSIT,
) =>
  ({
    estimatedDelivery: estimatedDelivery
      ? new Date(`${estimatedDelivery}T00:00:00Z`)
      : null,
    carrierStatus,
  }) as Shipment;

const NOW = new Date('2026-10-02T15:30:00Z');

describe('isLate', () => {
  it.each([
    ['due yesterday, in transit', shipment('2026-10-01'), true],
    ['due today, in transit', shipment('2026-10-02'), false],
    ['due tomorrow', shipment('2026-10-03'), false],
    [
      'due yesterday but delivered',
      shipment('2026-10-01', CarrierStatus.DELIVERED),
      false,
    ],
    [
      'due yesterday, with an exception',
      shipment('2026-10-01', CarrierStatus.EXCEPTION),
      true,
    ],
    ['never checked', shipment(null, null), false],
  ])(
    'Given a shipment %s, when judged on 2026-10-02, then late is %s',
    (_case, row, late) => {
      expect(isLate(row, NOW)).toBe(late);
    },
  );
});
