import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProtectionService } from './protection.service';

@ApiTags('Protection') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('protection')
export class ProtectionController {
  constructor(private readonly protection: ProtectionService) {}
  @Get(':deviceId') current(@Param('deviceId') deviceId: string, @Req() request: Request & { user: AuthenticatedUser }) { return this.protection.current(deviceId, request.user); }
  @Get(':deviceId/history') history(@Param('deviceId') deviceId: string, @Req() request: Request & { user: AuthenticatedUser }, @Query('limit') limit?: string) { return this.protection.history(deviceId, Number(limit) || 100, request.user); }
}