// src/coupons/coupons.controller.ts

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CouponValidationResponseDto } from './dto/coupon-validation-response.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check whether a coupon code is usable and what it would discount',
    description:
      'Read-only — does not consume a use. Redemption happens server-side as part of checkout.',
  })
  @ApiOkResponse({ type: CouponValidationResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  @ApiBadRequestResponse({
    description:
      'Coupon is inactive, expired, usage-limited, or the minimum purchase is not met',
  })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto.code, dto.purchaseAmount);
  }
}
