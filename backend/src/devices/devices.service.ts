import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.module';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { thresholdsAreOrdered } from './configuration-policy';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, pageSize = 25, search?: string, connectivityStatus?: string, user?: AuthenticatedUser) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const currentPage = Math.max(page, 1);
    const institutionId = institutionScope(user);
    const where = {
      ...(institutionId ? { institutionId } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { deviceId: { contains: search, mode: 'insensitive' as const } },
        { location: { contains: search, mode: 'insensitive' as const } },
      ] } : {}),
      ...(connectivityStatus ? { connectivityStatus: connectivityStatus as 'ONLINE' | 'OFFLINE' | 'UNKNOWN' } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        include: { configuration: true, institution: { select: { id: true, name: true } } },
        orderBy: [{ institution: { name: 'asc' } }, { updatedAt: 'desc' }],
        skip: (currentPage - 1) * take,
        take,
      }),
      this.prisma.device.count({ where }),
    ]);
    return { data: { items, total, page: currentPage, pageSize: take } };
  }

  async create(dto: CreateDeviceDto, user: AuthenticatedUser) {
    const deviceId = `PSM-${randomUUID().toUpperCase()}`;
    const institutionId = user.role === UserRole.SUPER_ADMIN ? dto.institutionId ?? null : institutionScope(user);
    if (user.role !== UserRole.SUPER_ADMIN && !user.institutionId) {
      throw new ForbiddenException('Your account is not assigned to an institution.');
    }
    if (user.role === UserRole.SUPER_ADMIN && !institutionId) {
      throw new BadRequestException('Select an institution for this device.');
    }
    if (institutionId && !await this.prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true } })) {
      throw new NotFoundException('Institution was not found.');
    }
    const { institutionId: _requestedInstitutionId, ...deviceData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({ data: { ...deviceData, deviceId, institutionId } });
      await tx.deviceConfiguration.create({ data: { deviceId: device.id } });
      await tx.activityLog.create({ data: { userId: user.sub, action: 'DEVICE_REGISTERED', entityType: 'Device', entityId: device.id } });
      return { data: device };
    });
  }

  async get(id: string, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id }, { deviceId: id }], ...(institutionScope(user) ? { institutionId: institutionScope(user) } : {}) },
      include: { configuration: true, institution: { select: { id: true, name: true } } },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    return { data: device };
  }

  async update(id: string, dto: UpdateDeviceDto, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id }, { deviceId: id }], ...(institutionScope(user) ? { institutionId: institutionScope(user) } : {}) },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    const updated = await this.prisma.device.update({ where: { id: device.id }, data: dto });
    return { data: updated };
  }

  async deactivate(id: string, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id }, { deviceId: id }], ...(institutionScope(user) ? { institutionId: institutionScope(user) } : {}) },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    const updated = await this.prisma.device.update({ where: { id: device.id }, data: { isActive: false } });
    return { data: updated };
  }

  async configuration(id: string, user?: AuthenticatedUser) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id }, { deviceId: id }], ...(institutionScope(user) ? { institutionId: institutionScope(user) } : {}) },
      include: { configuration: true },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    return { data: device.configuration };
  }

  async updateConfiguration(id: string, dto: UpdateConfigurationDto, actor: AuthenticatedUser) {
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id }, { deviceId: id }], ...(institutionScope(actor) ? { institutionId: institutionScope(actor) } : {}) },
      include: { configuration: true },
    });
    if (!device || !device.configuration) throw new NotFoundException('Device configuration was not found.');
    const current = device.configuration;
    const values = {
      criticalLowVoltageThreshold: dto.criticalLowVoltageThreshold ?? Number(current.criticalLowVoltageThreshold),
      lowVoltageThreshold: dto.lowVoltageThreshold ?? Number(current.lowVoltageThreshold),
      highVoltageThreshold: dto.highVoltageThreshold ?? Number(current.highVoltageThreshold),
      criticalHighVoltageThreshold: dto.criticalHighVoltageThreshold ?? Number(current.criticalHighVoltageThreshold),
    };
    if (!thresholdsAreOrdered(values)) {
      throw new BadRequestException('Thresholds must increase in order: critical undervoltage, warning undervoltage, warning overvoltage, critical overvoltage.');
    }
    return this.prisma.$transaction(async (tx) => {
      const configuration = await tx.deviceConfiguration.update({
        where: { deviceId: device.id },
        data: { ...dto, ...values, version: { increment: 1 }, deliveryStatus: 'PENDING', acknowledgedAt: null },
      });
      await tx.activityLog.create({
        data: { userId: actor.sub, action: 'DEVICE_CONFIGURATION_UPDATED', entityType: 'DeviceConfiguration', entityId: configuration.id, details: { version: configuration.version } },
      });
      return { data: configuration };
    });
  }

  async assignInstitution(id: string, institutionId: string, actorId: string) {
    const [device, institution] = await Promise.all([
      this.prisma.device.findFirst({ where: { OR: [{ id }, { deviceId: id }] }, select: { id: true } }),
      this.prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true } }),
    ]);
    if (!device) throw new NotFoundException('Device was not found.');
    if (!institution) throw new NotFoundException('Institution was not found.');
    const updated = await this.prisma.device.update({ where: { id: device.id }, data: { institutionId } });
    await this.prisma.activityLog.create({
      data: { userId: actorId, action: 'DEVICE_INSTITUTION_ASSIGNED', entityType: 'Device', entityId: device.id, details: { institutionId } },
    });
    return { data: updated };
  }
}