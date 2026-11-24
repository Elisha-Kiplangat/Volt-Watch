import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeasurementSource } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';
import { MonitoringGateway } from '../websocket/websocket.gateway';
import { TelemetryDto } from './dto/telemetry.dto';

@Injectable()
export class TelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MonitoringGateway,
    private readonly config: ConfigService,
  ) {}

  async ingest(dto: TelemetryDto, user?: AuthenticatedUser) {
    const source = dto.source ?? MeasurementSource.DEVICE;
    if (source === MeasurementSource.SIMULATED && (this.config.get<string>('DEMO_MODE') !== 'true' || this.config.get<string>('NODE_ENV') === 'production')) {
      throw new ForbiddenException('Simulated telemetry is disabled.');
    }
    const institutionId = institutionScope(user);
    const device = await this.prisma.device.findFirst({
      where: { deviceId: dto.deviceId, ...(institutionId ? { institutionId } : {}) },
    });
    if (!device || !device.isActive) throw new NotFoundException('Active device was not found.');

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    const reading = await this.prisma.$transaction(async (tx) => {
      const savedReading = await tx.sensorReading.create({
        data: {
          deviceId: device.id,
          voltage: dto.voltage,
          current: dto.current,
          frequency: dto.frequency,
          power: dto.power,
          source,
          recordedAt,
        },
      });
      if (source === MeasurementSource.DEVICE) {
        await tx.device.update({ where: { id: device.id }, data: { connectivityStatus: 'ONLINE', lastSeenAt: new Date() } });
      }
      return savedReading;
    });

    this.gateway.broadcast('telemetry:update', { deviceId: device.deviceId, reading }, device.deviceId, device.institutionId ?? undefined);
    if (source === MeasurementSource.DEVICE) {
      this.gateway.broadcast('device:status', { deviceId: device.deviceId, connectivityStatus: 'ONLINE' }, device.deviceId, device.institutionId ?? undefined);
    }
    return { data: reading };
  }

  async list(deviceId?: string, limit = 100, user?: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const device = deviceId ? await this.prisma.device.findFirst({
      where: { deviceId, ...(institutionId ? { institutionId } : {}) },
    }) : undefined;
    if (deviceId && !device) throw new NotFoundException('Device was not found.');
    const readings = await this.prisma.sensorReading.findMany({
      where: device
        ? { deviceId: device.id }
        : institutionId
          ? { device: { is: { institutionId } } }
          : undefined,
      orderBy: { recordedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      include: { device: { select: { deviceId: true, name: true } } },
    });
    return { data: readings };
  }
}