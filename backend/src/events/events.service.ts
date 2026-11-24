import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Severity, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';
import { MonitoringGateway } from '../websocket/websocket.gateway';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: MonitoringGateway) {}

  async list(page = 1, pageSize = 25, deviceId?: string, severity?: Severity, from?: Date, to?: Date, user?: AuthenticatedUser) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const institutionId = institutionScope(user);
    const deviceFilter = {
      ...(deviceId ? { deviceId } : {}),
      ...(institutionId ? { institutionId } : {}),
    };
    const where = {
      ...(Object.keys(deviceFilter).length ? { device: { is: deviceFilter } } : {}),
      ...(severity ? { severity } : {}),
      ...(from || to ? { eventTimestamp: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.surgeEvent.findMany({ where, include: { device: { select: { deviceId: true, name: true } }, alert: true }, orderBy: { eventTimestamp: 'desc' }, skip: (Math.max(1, page) - 1) * take, take }),
      this.prisma.surgeEvent.count({ where }),
    ]);
    return { data: { items, total, page: Math.max(1, page), pageSize: take } };
  }

  async get(id: string, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const event = await this.prisma.surgeEvent.findFirst({
      where: { id, ...(institutionId ? { device: { is: { institutionId } } } : {}) },
      include: { device: true, alert: true },
    });
    if (!event) throw new NotFoundException('Event was not found.');
    return { data: event };
  }

  async create(dto: CreateEventDto, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const device = await this.prisma.device.findFirst({
      where: { deviceId: dto.deviceId, ...(institutionId ? { institutionId } : {}) },
    });
    if (!device || !device.isActive) throw new NotFoundException('Active device was not found.');
    if (dto.externalId || dto.deduplicationKey) {
      const duplicate = await this.prisma.surgeEvent.findFirst({
        where: { deviceId: device.id, OR: [
          ...(dto.externalId ? [{ externalId: dto.externalId }] : []),
          ...(dto.deduplicationKey ? [{ deduplicationKey: dto.deduplicationKey }] : []),
        ] },
      });
      if (duplicate) return { data: duplicate, duplicate: true };
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.surgeEvent.create({
        data: {
          deviceId: device.id,
          eventType: dto.eventType,
          severity: dto.severity,
          description: dto.description,
          voltage: dto.voltage,
          externalId: dto.externalId,
          deduplicationKey: dto.deduplicationKey,
          eventTimestamp: dto.eventTimestamp ? new Date(dto.eventTimestamp) : new Date(),
        },
      });
      if (dto.severity !== Severity.INFO) {
        await tx.alert.create({
          data: {
            deviceId: device.id,
            eventId: created.id,
            title: dto.eventType.replaceAll('_', ' '),
            message: dto.description,
            severity: dto.severity,
          },
        });
        const recipients = await tx.user.findMany({
          where: {
            isActive: true,
            approvalStatus: 'APPROVED',
            OR: [
              ...(device.institutionId ? [{ institutionId: device.institutionId }] : []),
              { role: UserRole.SUPER_ADMIN },
            ],
          },
          select: { id: true },
        });
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map(({ id }) => ({
              userId: id,
              title: dto.eventType.replaceAll('_', ' '),
              message: dto.description,
              type: dto.severity,
            })),
          });
        }
      }
      return created;
    });

    const payload = { ...event, deviceId: device.deviceId };
    this.gateway.broadcast('event:created', payload, device.deviceId, device.institutionId ?? undefined);
    if (dto.eventType === 'TRANSIENT_SURGE') this.gateway.broadcast('surge:detected', payload, device.deviceId, device.institutionId ?? undefined);
    if (dto.severity !== Severity.INFO) this.gateway.broadcast('alert:created', payload, device.deviceId, device.institutionId ?? undefined);
    return { data: event };
  }
}