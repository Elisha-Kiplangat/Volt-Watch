import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { PrismaService } from '../database/prisma.module';
import { GenerateReportDto } from './dto/generate-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    return {
      data: await this.prisma.report.findMany({
        where: institutionId ? { institutionId } : undefined,
        include: { device: { select: { deviceId: true, name: true } }, requestedBy: { select: { id: true, fullName: true } }, institution: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    };
  }

  async get(id: string, user: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const report = await this.prisma.report.findFirst({
      where: { id, ...(institutionId ? { institutionId } : {}) },
      include: { device: true, requestedBy: { select: { id: true, fullName: true } }, institution: { select: { id: true, name: true } } },
    });
    if (!report) throw new NotFoundException('Report was not found.');
    return { data: report };
  }

  async generate(dto: GenerateReportDto, user: AuthenticatedUser) {
    const institutionId = institutionScope(user);
    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);
    if (periodFrom >= periodTo) throw new BadRequestException('The report start must be earlier than its end.');
    const device = dto.deviceId ? await this.prisma.device.findFirst({
      where: { deviceId: dto.deviceId, ...(institutionId ? { institutionId } : {}) },
    }) : null;
    if (dto.deviceId && !device) throw new NotFoundException('Device was not found.');

    const readingWhere = {
      ...(device ? { deviceId: device.id } : institutionId ? { device: { is: { institutionId } } } : {}),
      recordedAt: { gte: periodFrom, lte: periodTo },
    };
    const eventWhere = {
      ...(device ? { deviceId: device.id } : institutionId ? { device: { is: { institutionId } } } : {}),
      eventTimestamp: { gte: periodFrom, lte: periodTo },
    };
    const [readings, eventCount, eventsByType, alertCount] = await this.prisma.$transaction([
      this.prisma.sensorReading.aggregate({ where: readingWhere, _avg: { voltage: true, current: true, frequency: true, power: true }, _min: { voltage: true }, _max: { voltage: true }, _count: { _all: true } }),
      this.prisma.surgeEvent.count({ where: eventWhere }),
      this.prisma.surgeEvent.groupBy({ by: ['eventType'], where: eventWhere, orderBy: { eventType: 'asc' }, _count: { _all: true } }),
      this.prisma.alert.count({
        where: {
          ...(device ? { deviceId: device.id } : institutionId ? { device: { is: { institutionId } } } : {}),
          createdAt: { gte: periodFrom, lte: periodTo },
        },
      }),
    ]);

    const summary = {
      readingCount: readings._count._all,
      averageVoltage: readings._avg.voltage?.toNumber() ?? null,
      minimumVoltage: readings._min.voltage?.toNumber() ?? null,
      maximumVoltage: readings._max.voltage?.toNumber() ?? null,
      averageCurrent: readings._avg.current?.toNumber() ?? null,
      averageFrequency: readings._avg.frequency?.toNumber() ?? null,
      averagePower: readings._avg.power?.toNumber() ?? null,
      eventCount,
      alertCount,
      eventsByType,
    };
    const title = `${dto.reportType.replaceAll('_', ' ')} report`;
    const report = await this.prisma.report.create({
      data: {
        title,
        reportType: dto.reportType,
        deviceId: device?.id,
        institutionId: device?.institutionId ?? (institutionId === '__no_institution__' ? null : institutionId),
        requestedById: user.sub,
        periodFrom,
        periodTo,
        summary,
      },
    });
    return { data: report };
  }
}