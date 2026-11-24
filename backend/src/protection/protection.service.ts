import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';

@Injectable()
export class ProtectionService {
  constructor(private readonly prisma: PrismaService) {}

  async current(deviceId: string, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const device = await this.prisma.device.findFirst({
      where: { deviceId, ...(institutionId ? { institutionId } : {}) },
      include: { protectionLogs: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    return { data: { deviceId, protectionState: device.protectionState, latestLog: device.protectionLogs[0] ?? null } };
  }

  async history(deviceId: string, limit = 100, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const device = await this.prisma.device.findFirst({
      where: { deviceId, ...(institutionId ? { institutionId } : {}) },
      select: { id: true },
    });
    if (!device) throw new NotFoundException('Device was not found.');
    return { data: await this.prisma.protectionLog.findMany({ where: { deviceId: device.id }, orderBy: { recordedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500) }) };
  }
}