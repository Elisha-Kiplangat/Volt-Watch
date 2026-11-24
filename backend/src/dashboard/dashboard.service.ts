import { Injectable } from '@nestjs/common';
import { ProtectionState, EventType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const deviceWhere = { isActive: true, ...(institutionId ? { institutionId } : {}) };
    const relatedDeviceWhere = institutionId ? { device: { is: { institutionId } } } : {};
    const [
      totalDevices,
      onlineDevices,
      offlineDevices,
      normalDevices,
      warningDevices,
      trippedDevices,
      surgeEvents,
      unacknowledgedAlerts,
      readings,
      recentEvents,
      devices,
    ] = await this.prisma.$transaction([
      this.prisma.device.count({ where: deviceWhere }),
      this.prisma.device.count({ where: { ...deviceWhere, connectivityStatus: 'ONLINE' } }),
      this.prisma.device.count({ where: { ...deviceWhere, connectivityStatus: 'OFFLINE' } }),
      this.prisma.device.count({ where: { ...deviceWhere, protectionState: ProtectionState.NORMAL } }),
      this.prisma.device.count({ where: { ...deviceWhere, protectionState: { in: [ProtectionState.WARNING_UNDERVOLTAGE, ProtectionState.WARNING_OVERVOLTAGE] } } }),
      this.prisma.device.count({ where: { ...deviceWhere, protectionState: { in: [ProtectionState.TRIPPED_UNDERVOLTAGE, ProtectionState.TRIPPED_OVERVOLTAGE, ProtectionState.TRIPPED_POWER_FAILURE, ProtectionState.TRIPPED_TRANSIENT] } } }),
      this.prisma.surgeEvent.count({ where: { ...relatedDeviceWhere, eventType: EventType.TRANSIENT_SURGE } }),
      this.prisma.alert.count({ where: { ...relatedDeviceWhere, status: 'ACTIVE' } }),
      this.prisma.sensorReading.findMany({ where: relatedDeviceWhere, orderBy: { recordedAt: 'desc' }, take: 100, select: { voltage: true, recordedAt: true, source: true } }),
      this.prisma.surgeEvent.findMany({ where: relatedDeviceWhere, orderBy: { eventTimestamp: 'desc' }, take: 8, select: { id: true, eventType: true, description: true, severity: true, eventTimestamp: true } }),
      this.prisma.device.findMany({ where: deviceWhere, orderBy: { lastSeenAt: 'desc' }, take: 6, select: { id: true, deviceId: true, name: true, location: true, connectivityStatus: true, protectionState: true, lastSeenAt: true, institution: { select: { id: true, name: true } } } }),
    ]);

    return {
      data: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        normalDevices,
        warningDevices,
        trippedDevices,
        surgeEvents,
        unacknowledgedAlerts,
        voltageTrend: readings.reverse().map((reading) => ({
          voltageDevice: reading.source === 'DEVICE' ? Number(reading.voltage) : null,
          voltageSimulated: reading.source === 'SIMULATED' ? Number(reading.voltage) : null,
          recordedAt: reading.recordedAt,
        })),
        recentEvents,
        devices,
      },
    };
  }

  async analytics(user: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const deviceWhere = { isActive: true, ...(institutionId ? { institutionId } : {}) };
    const relatedDeviceWhere = institutionId ? { device: { is: { institutionId } } } : {};
    const [devices, events, alerts] = await this.prisma.$transaction([
      this.prisma.device.findMany({ where: deviceWhere, select: { connectivityStatus: true, protectionState: true, lastSeenAt: true } }),
      this.prisma.surgeEvent.groupBy({ by: ['eventType', 'severity'], where: relatedDeviceWhere, orderBy: [{ eventType: 'asc' }, { severity: 'asc' }], _count: { _all: true } }),
      this.prisma.alert.groupBy({ by: ['severity', 'status'], where: relatedDeviceWhere, orderBy: [{ severity: 'asc' }, { status: 'asc' }], _count: { _all: true } }),
    ]);
    return { data: { devices, events, alerts } };
  }
}