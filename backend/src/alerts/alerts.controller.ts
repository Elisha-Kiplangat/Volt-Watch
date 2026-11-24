import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlertStatus, Severity, UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AlertsService } from './alerts.service';
import { AssignAlertDto } from './dto/assign-alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Req() request: Request & { user: AuthenticatedUser }, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('severity') severity?: Severity, @Query('status') status?: AlertStatus, @Query('search') search?: string) {
    return this.alerts.list(Number(page) || 1, Number(pageSize) || 25, severity, status, search, request.user);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) { return this.alerts.get(id, request.user); }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assign(@Param('id') id: string, @Body() dto: AssignAlertDto, @Req() request: Request & { user: AuthenticatedUser }) { return this.alerts.assign(id, dto.userId, request.user); }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.alerts.acknowledge(id, request.user);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resolve(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.alerts.resolve(id, request.user);
  }
}