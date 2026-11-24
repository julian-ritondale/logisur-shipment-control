import {
  CarrierRequestError,
  DeliveryStatus,
} from '../../../carriers/carrier-client.js';
import { Carrier } from '../../../carriers/carrier-registry.js';
import { carrierAccess, fromCarrierError } from '../carrier-access.js';
import { ReasonCode } from '../reasons.js';
import { Step } from '../types/pipeline.types.js';
import { fromDeliveryOutcome } from './deliverer.js';

describe('delivery outcomes', () => {
  describe('Scenario: the carrier has the shipment', () => {
    it('Given DELIVERED (created now, or the carrier already had it), when translated, then it is delivered with its tracking id', () => {
      expect(
        fromDeliveryOutcome({
          status: DeliveryStatus.DELIVERED,
          trackingId: 'AND1',
        }),
      ).toEqual({
        ok: true,
        value: { trackingId: 'AND1' },
      });
    });
  });

  describe('Scenario: the carrier does not have it', () => {
    it('Given REJECTED, when translated, then the message names our fields in business terms', () => {
      expect(
        fromDeliveryOutcome({
          status: DeliveryStatus.REJECTED,
          rejections: [
            { field: 'postalCode', message: 'required' },
            { field: 'packages', message: 'must be >= 1' },
            { message: 'surcharge: unknown' },
          ],
        }),
      ).toMatchObject({
        ok: false,
        failure: {
          step: Step.DELIVER,
          code: ReasonCode.REJECTED_BY_CARRIER,
          message:
            'The carrier rejected the shipment (postal code: required; number of packages: must be >= 1; surcharge: unknown)',
        },
      });
    });

    it.each([
      [
        { status: DeliveryStatus.UNAUTHORIZED } as const,
        ReasonCode.INVALID_CARRIER_CREDENTIALS,
      ],
      [
        {
          status: DeliveryStatus.UNAVAILABLE,
          detail: { status: 503 },
        } as const,
        ReasonCode.CARRIER_UNAVAILABLE,
      ],
    ])(
      'Given %j, when translated, then it fails at DELIVER with %s',
      (outcome, code) => {
        expect(fromDeliveryOutcome(outcome)).toMatchObject({
          ok: false,
          failure: { step: Step.DELIVER, code },
        });
      },
    );
  });

  describe('Scenario: carrier requests that fail outright', () => {
    it.each([
      [
        new CarrierRequestError(DeliveryStatus.UNAUTHORIZED, 'API key refused'),
        ReasonCode.INVALID_CARRIER_CREDENTIALS,
      ],
      [
        new CarrierRequestError(DeliveryStatus.UNAVAILABLE, '503'),
        ReasonCode.CARRIER_UNAVAILABLE,
      ],
      [new TypeError('fetch failed'), ReasonCode.CARRIER_UNAVAILABLE],
    ])(
      'Given %s while validating, when translated, then it fails at VALIDATE with %s',
      (error, code) => {
        expect(fromCarrierError(Step.VALIDATE, error)).toMatchObject({
          step: Step.VALIDATE,
          code,
        });
      },
    );

    it('Given a carrier without an integration, when it is used, then the failure names the carrier', () => {
      expect(
        carrierAccess(Carrier.CRUZ_DEL_NORTE).missing(Step.VALIDATE),
      ).toEqual({
        step: Step.VALIDATE,
        code: ReasonCode.NO_CARRIER_INTEGRATION,
        message: 'There is no integration to deliver to Cruz del Norte yet',
      });
    });
  });
});
