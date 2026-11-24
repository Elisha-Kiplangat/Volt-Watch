import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.module';
import { AuthenticatedUser } from '../auth/auth.types';
import { institutionScope } from '../auth/institution-scope';
import { MonitoringGateway } from '../websocket/websocket.gateway';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: MonitoringGateway) {}

  async list() {
    return {
      data: await this.prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          approvalStatus: true,
          isActive: true,
          institution: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        approvalStatus: true,
        isActive: true,
        institution: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User was not found.');
    return { data: user };
  }

  async createAdmin(dto: CreateAdminDto, actorId: string) {
    if (dto.fullName.trim().length < 2) throw new BadRequestException('Enter a valid full name.');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists.');
    }

    const name = dto.institutionName.trim();
    if (name.length < 2) throw new BadRequestException('Enter a valid institution name.');
    const normalizedName = name.toLowerCase();
    let institution = await this.prisma.institution.findUnique({ where: { normalizedName } });
    if (!institution) {
      try {
        institution = await this.prisma.institution.create({ data: { name, normalizedName } });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
        institution = await this.prisma.institution.findUniqueOrThrow({ where: { normalizedName } });
      }
    }

    const password = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          password,
          role: UserRole.ADMIN,
          approvalStatus: 'APPROVED',
          institutionId: institution.id,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          approvalStatus: true,
          institution: { select: { id: true, name: true } },
          createdAt: true,
        },
      });
      await this.prisma.activityLog.create({
        data: { userId: actorId, action: 'ADMIN_CREATED', entityType: 'User', entityId: user.id },
      });
      return { data: user };
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('An account with this email already exists.');
      throw error;
    }
  }

  async pendingOperators(actor: AuthenticatedUser) {
    const institutionId = institutionScope(actor);
    return {
      data: await this.prisma.user.findMany({
        where: {
          role: UserRole.OPERATOR,
          approvalStatus: 'PENDING',
          ...(institutionId ? { institutionId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          approvalStatus: true,
          institution: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    };
  }

  async approveOperator(id: string, actor: AuthenticatedUser) {
    const institutionId = institutionScope(actor);
    const result = await this.prisma.user.updateMany({
      where: {
        id,
        role: UserRole.OPERATOR,
        approvalStatus: 'PENDING',
        ...(institutionId ? { institutionId } : {}),
      },
      data: { approvalStatus: 'APPROVED', isActive: true },
    });
    if (result.count !== 1) throw new NotFoundException('Pending operator was not found in your institution.');

    const approved = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        approvalStatus: true,
        institution: { select: { id: true, name: true } },
      },
    });
    if (!approved) throw new NotFoundException('Approved operator was not found.');
    await this.prisma.activityLog.create({
      data: { userId: actor.sub, action: 'OPERATOR_APPROVED', entityType: 'User', entityId: id },
    });
    return { data: approved };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    if (dto.institutionId && !await this.prisma.institution.findUnique({ where: { id: dto.institutionId }, select: { id: true } })) {
      throw new NotFoundException('Institution was not found.');
    }
    if (dto.role && dto.role !== 'OPERATOR') {
      await this.prisma.activityLog.create({ data: { userId: actorId, action: 'USER_ROLE_CHANGE_ATTEMPT', entityType: 'User', entityId: id } });
    }
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { ...dto, email: dto.email?.trim().toLowerCase() },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          approvalStatus: true,
          isActive: true,
          institution: { select: { id: true, name: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
      await this.prisma.activityLog.create({ data: { userId: actorId, action: 'USER_UPDATED', entityType: 'User', entityId: id } });
      if (dto.role || dto.institutionId || dto.isActive !== undefined) await this.gateway.revokeUser(id);
      return { data: user };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') throw new NotFoundException('User was not found.');
      throw error;
    }
  }

  async deactivate(id: string, actorId: string) {
    if (id === actorId) throw new NotFoundException('Use account settings to deactivate your own account.');
    return this.update(id, { isActive: false }, actorId);
  }

  private isUniqueViolation(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}