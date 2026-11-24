import { Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.notifications.list(request.user.sub, Number(page) || 1, Number(pageSize) || 25);
  }
  @Patch(':id/read') markRead(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.notifications.markRead(id, request.user.sub);
  }
}