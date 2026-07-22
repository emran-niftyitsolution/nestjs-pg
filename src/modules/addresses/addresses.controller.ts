// src/modules/addresses/addresses.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { AddressesService } from './addresses.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// Fully self-service — a user only ever manages their own addresses, and
// nothing in the PRD's admin capability list mentions addresses.
@ApiTags('addresses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List my addresses (default first)' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my addresses' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Add an address' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Make this my default address' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.setDefault(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}
