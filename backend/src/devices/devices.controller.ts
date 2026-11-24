import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssignInstitutionDto } from './dto/assign-institution.dto';
import { TelemetryService } from '../telemetry/telemetry.service';
import { EventsService } from '../events/events.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { DevicesService } from './devices.service';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService, private readonly telemetry: TelemetryService, private readonly events: EventsService) {}

  @Get()
  list(@Req() request: Request & { user: AuthenticatedUser }, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string, @Query('connectivityStatus') status?: string) {
    return this.devices.list(Number(page) || 1, Number(pageSize) || 25, search, status, request.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateDeviceDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.create(dto, request.user);
  }

  @Get(':id/telemetry')
  telemetryHistory(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }, @Query('limit') limit?: string) {
    return this.telemetry.list(id, Number(limit) || 100, request.user);
  }

  @Get(':id/events')
  eventHistory(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.events.list(1, 100, id, undefined, undefined, undefined, request.user);
  }

  @Get(':id/configuration')
  configuration(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.configuration(id, request.user);
  }

  @Patch(':id/configuration')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateConfiguration(@Param('id') id: string, @Body() dto: UpdateConfigurationDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.updateConfiguration(id, dto, request.user);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.get(id, request.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.update(id, dto, request.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deactivate(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.deactivate(id, request.user);
  }

  @Patch(':id/institution')
  @Roles(UserRole.SUPER_ADMIN)
  assignInstitution(@Param('id') id: string, @Body() dto: AssignInstitutionDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.devices.assignInstitution(id, dto.institutionId, request.user.sub);
  }
}