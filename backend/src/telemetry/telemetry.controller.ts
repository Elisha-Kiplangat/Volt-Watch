import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MeasurementSource, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TelemetryDto } from './dto/telemetry.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('Telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService, private readonly config: ConfigService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  ingest(@Body() dto: TelemetryDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.telemetry.ingest(dto, request.user);
  }

  @Post('simulate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  simulate(@Body() dto: TelemetryDto, @Req() request: Request & { user: AuthenticatedUser }) {
    if (this.config.get<string>('DEMO_MODE') !== 'true' || this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Manual simulation is available only in explicitly enabled non-production environments.');
    }
    return this.telemetry.ingest({ ...dto, source: MeasurementSource.SIMULATED }, request.user);
  }

  @Get()
  list(@Req() request: Request & { user: AuthenticatedUser }, @Query('limit') limit?: string) {
    return this.telemetry.list(undefined, Number(limit) || 100, request.user);
  }
}