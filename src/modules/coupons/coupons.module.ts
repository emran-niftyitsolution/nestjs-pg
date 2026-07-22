// src/coupons/coupons.module.ts

import { Module } from '@nestjs/common';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { CouponsResolver } from './graphql/coupons.resolver';

@Module({
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService, CouponsResolver],
  exports: [CouponsService],
})
export class CouponsModule {}
