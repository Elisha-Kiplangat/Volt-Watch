import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.module';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, institutionId: true, isActive: true, approvalStatus: true },
    });
    if (!user?.isActive || user.approvalStatus !== 'APPROVED') {
      throw new UnauthorizedException('Account is inactive or not approved.');
    }
    if (user.role !== UserRole.SUPER_ADMIN && !user.institutionId) {
      throw new UnauthorizedException('Account is not assigned to an institution.');
    }
    return { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId };
  }
}