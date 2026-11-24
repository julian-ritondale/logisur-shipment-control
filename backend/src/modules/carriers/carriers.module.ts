import { Module } from '@nestjs/common';
import { ExpresoAndinoCarrier } from '../../integrations/expreso-andino/expreso-andino.carrier.js';
import { ExpresoAndinoModule } from '../../integrations/expreso-andino/expreso-andino.module.js';
import { CARRIER_ROUTER, MapCarrierRouter } from './carrier-router.js';

/**
 * Carriers: provides `CARRIER_ROUTER` with every carrier integration we have. To add a
 * carrier: write its integration under `src/integrations/`, import its module
 * here and register its client below.
 */
@Module({
  imports: [ExpresoAndinoModule],
  providers: [
    {
      provide: CARRIER_ROUTER,
      inject: [ExpresoAndinoCarrier],
      useFactory: (expresoAndino: ExpresoAndinoCarrier) =>
        new MapCarrierRouter({ EXPRESO_ANDINO: expresoAndino }),
    },
  ],
  exports: [CARRIER_ROUTER],
})
export class CarriersModule {}
