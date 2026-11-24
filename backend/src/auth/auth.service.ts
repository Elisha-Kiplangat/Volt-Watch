import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.module';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = Pick<User, 'id' | 'fullName' | 'email' | 'role' | 'approvalStatus' | 'institutionId' | 'createdAt'> & {
  institution: { id: string; name: string } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.fullName.trim().length < 2) throw new BadRequestException('Enter a valid full name.');
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists.');
    }
    const institution = await this.prisma.institution.findUnique({ where: { id: dto.institutionId } });
    if (!institution) throw new ForbiddenException('Choose a valid institution.');
    const password = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        password,
        role: UserRole.OPERATOR,
        approvalStatus: 'PENDING',
        institutionId: institution.id,
      },
    });
    return { data: { approvalStatus: 'PENDING', message: 'Your account is awaiting approval by an institution administrator.' } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    if (user.approvalStatus === 'PENDING') {
      throw new ForbiddenException('Your account is awaiting approval by an institution administrator.');
    }
    if (user.approvalStatus !== 'APPROVED') {
      throw new ForbiddenException('Your account has not been approved.');
    }
    if (user.role !== UserRole.SUPER_ADMIN && !user.institutionId) {
      throw new ForbiddenException('Your account is not assigned to an institution.');
    }
    return this.issueTokens(user);
  }

  async listInstitutions() {
    return {
      data: await this.prisma.institution.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    };
  }

  async refresh(rawToken: string) {
    let payload: { sub: string; tokenType: string };
    try {
      payload = await this.jwt.verifyAsync(rawToken, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    if (payload.tokenType !== 'refresh') throw new UnauthorizedException('Invalid token type.');

    const tokenHash = this.hashToken(rawToken);
    const saved = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!saved || saved.userId !== payload.sub || saved.expiresAt <= new Date()) throw new UnauthorizedException('Refresh token is invalid or expired.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive || user.approvalStatus !== 'APPROVED') throw new UnauthorizedException('Account is inactive or not approved.');
    if (user.role !== UserRole.SUPER_ADMIN && !user.institutionId) {
      throw new UnauthorizedException('Account is not assigned to an institution.');
    }

    const consumed = await this.prisma.refreshToken.deleteMany({ where: { id: saved.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new UnauthorizedException('Refresh token is invalid or expired.');
    return this.issueTokens(user);
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.hashToken(rawToken) } });
    return { success: true };
  }

  async me(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        approvalStatus: true,
        institutionId: true,
        createdAt: true,
        institution: { select: { id: true, name: true } },
        isActive: true,
      },
    });
    if (!user?.isActive || user.approvalStatus !== 'APPROVED') throw new UnauthorizedException('Account is inactive or not approved.');
    if (user.role !== UserRole.SUPER_ADMIN && !user.institutionId) {
      throw new UnauthorizedException('Account is not assigned to an institution.');
    }
    const { isActive: _isActive, ...safeUser } = user;
    return safeUser;
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId, tokenType: 'refresh' },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { tokenHash: this.hashToken(refreshToken), userId: user.id, expiresAt },
    });
    const { password: _password, ...safeUser } = user;
    const institution = user.institutionId
      ? await this.prisma.institution.findUnique({ where: { id: user.institutionId }, select: { id: true, name: true } })
      : null;
    return { data: { accessToken, refreshToken, expiresAt, user: { ...safeUser, institution } } };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}