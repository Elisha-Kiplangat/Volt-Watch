import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { Request } from 'express';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }) { return this.reports.list(request.user); }
  @Get(':id') get(@Param('id') id: string, @Req() request: Request & { user: AuthenticatedUser }) { return this.reports.get(id, request.user); }
  @Post('generate') generate(@Body() dto: GenerateReportDto, @Req() request: Request & { user: AuthenticatedUser }) { return this.reports.generate(dto, request.user); }
}