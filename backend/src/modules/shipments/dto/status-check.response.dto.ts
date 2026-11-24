/** The result of asking the carrier where each loaded, undelivered shipment is. */
export class StatusCheckResponseDto {
  /** Shipments asked about. */
  checked: number;
  /** Shipments the carrier couldn't answer for (they keep their last known status). */
  failed: number;
  /** Shipments past their estimated delivery, not delivered to the customer. */
  late: number;
  /** Shipments the carrier reports as `EXCEPTION`. */
  exceptions: number;
  checkedAt: Date;
}
