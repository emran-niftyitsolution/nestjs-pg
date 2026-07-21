// src/dashboard/dashboard.module.ts

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardResolver } from './graphql/dashboard.resolver';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardResolver],
  exports: [DashboardService],
})
export class DashboardModule {}
