import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Severity, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';
import { MonitoringGateway } from '../websocket/websocket.gateway';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: MonitoringGateway) {}

  async list(page = 1, pageSize = 25, severity?: Severity, status?: AlertStatus, search?: string, user?: AuthenticatedUser) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const institutionId = institutionScope(user);
    const where = {
      ...(institutionId ? { device: { is: { institutionId } } } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { message: { contains: search, mode: 'insensitive' as const } },
        { device: { name: { contains: search, mode: 'insensitive' as const } } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({ where, include: { device: { select: { deviceId: true, name: true } }, acknowledgedBy: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * take, take }),
      this.prisma.alert.count({ where }),
    ]);
    return { data: { items, total, page: Math.max(1, page), pageSize: take } };
  }

  async get(id: string, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const alert = await this.prisma.alert.findFirst({
      where: { id, ...(institutionId ? { device: { is: { institutionId } } } : {}) },
      include: { device: true, event: true, acknowledgedBy: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } } },
    });
    if (!alert) throw new NotFoundException('Alert was not found.');
    return { data: alert };
  }

  async assign(id: string, userId: string, actor: AuthenticatedUser) {
    const institutionId = institutionScope(actor);
    const alert = await this.prisma.alert.findFirst({
      where: { id, ...(institutionId ? { device: { is: { institutionId } } } : {}) },
      include: { device: { select: { institutionId: true } } },
    });
    if (!alert) throw new NotFoundException('Alert was not found.');
    if (alert.status === AlertStatus.RESOLVED) throw new ConflictException('Resolved alerts cannot be acknowledged.');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || user.approvalStatus !== 'APPROVED' || user.role !== UserRole.OPERATOR || user.institutionId !== alert.device.institutionId) {
      throw new NotFoundException('Active operator in this institution was not found.');
    }
    return { data: await this.prisma.alert.update({ where: { id }, data: { assignedToId: userId } }) };
  }

  async acknowledge(id: string, actor: AuthenticatedUser) {
    const institutionId = institutionScope(actor);
    const alert = await this.prisma.alert.findFirst({
      where: { id, ...(institutionId ? { device: { is: { institutionId } } } : {}) },
      include: { device: { select: { institutionId: true } } },
    });
    if (!alert) throw new NotFoundException('Alert was not found.');
    if (actor.role === UserRole.OPERATOR && alert.assignedToId !== actor.sub) {
      throw new ForbiddenException('Operators can acknowledge only alerts assigned to them.');
    }
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.ACKNOWLEDGED, acknowledgedById: actor.sub, acknowledgedAt: new Date() },
    });
    this.gateway.broadcast('alert:updated', updated, alert.deviceId, alert.device.institutionId ?? undefined);
    return { data: updated };
  }

  async resolve(id: string, actor: AuthenticatedUser) {
    const institutionId = institutionScope(actor);
    const alert = await this.prisma.alert.findFirst({
      where: { id, ...(institutionId ? { device: { is: { institutionId } } } : {}) },
      include: { device: { select: { institutionId: true } } },
    });
    if (!alert) throw new NotFoundException('Alert was not found.');
    const updated = await this.prisma.alert.update({ where: { id }, data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() } });
    await this.prisma.activityLog.create({ data: { userId: actor.sub, action: 'ALERT_RESOLVED', entityType: 'Alert', entityId: id } });
    this.gateway.broadcast('alert:updated', updated, alert.deviceId, alert.device.institutionId ?? undefined);
    return { data: updated };
  }
}