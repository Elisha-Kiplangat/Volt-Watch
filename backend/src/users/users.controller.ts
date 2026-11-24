import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN) @Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get() list() { return this.users.list(); }
  
  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.users.createAdmin(dto, request.user.sub);
  }

  @Get('pending-operators')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  pendingOperators(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.users.pendingOperators(request.user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approveOperator(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.users.approveOperator(id, request.user);
  }

  @Get(':id') get(@Param('id') id: string) { return this.users.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() request: Request & { user: AuthenticatedUser }) { return this.users.update(id, dto, request.user.sub); }
  @Delete(':id') deactivate(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) { return this.users.deactivate(id, request.user.sub); }
}