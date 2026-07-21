// src/payments/dto/create-payment.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiPropertyOptional({
    description:
      'Mock-only: force the simulated gateway call to fail, so the failure path can be exercised deterministically instead of leaving it untestable.',
  })
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
