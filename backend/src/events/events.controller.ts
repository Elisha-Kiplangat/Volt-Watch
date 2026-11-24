import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Severity, UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Req() request: Request & { user: AuthenticatedUser }, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('deviceId') deviceId?: string, @Query('severity') severity?: Severity, @Query('from') from?: string, @Query('to') to?: string) {
    return this.events.list(Number(page) || 1, Number(pageSize) || 25, deviceId, severity, from ? new Date(from) : undefined, to ? new Date(to) : undefined, request.user);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) { return this.events.get(id, request.user); }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateEventDto, @Req() request: Request & { user: AuthenticatedUser }) { return this.events.create(dto, request.user); }
}