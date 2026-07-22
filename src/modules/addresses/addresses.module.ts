// src/modules/addresses/addresses.module.ts

import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { AddressesResolver } from './graphql/addresses.resolver';

@Module({
  controllers: [AddressesController],
  providers: [AddressesService, AddressesResolver],
  exports: [AddressesService],
})
export class AddressesModule {}
