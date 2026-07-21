// src/brands/brands.module.ts

import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandsResolver } from './graphql/brands.resolver';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, BrandsResolver],
  exports: [BrandsService],
})
export class BrandsModule {}
