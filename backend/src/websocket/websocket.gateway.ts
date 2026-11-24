import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.module';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/monitoring', cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true } })
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MonitoringGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string') {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      if (payload.tokenType === 'refresh') throw new Error('Refresh tokens cannot establish socket connections.');
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, institutionId: true, isActive: true, approvalStatus: true },
      });
      if (!user?.isActive || user.approvalStatus !== 'APPROVED') throw new Error('Account is inactive or not approved.');
      client.data.userId = user.id;
      if (user.role === UserRole.SUPER_ADMIN) {
        await client.join('role:SUPER_ADMIN');
      } else if (user.institutionId) {
        await client.join(`institution:${user.institutionId}`);
      } else {
        client.disconnect(true);
        return;
      }
    } catch {
      client.disconnect(true);
      return;
    }
    this.logger.debug(`Authenticated monitoring socket ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Disconnected monitoring socket ${client.id}`);
  }

  async revokeUser(userId: string) {
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data.userId === userId) socket.disconnect(true);
    }
  }

  broadcast(event: string, payload: Record<string, unknown>, _deviceId?: string, institutionId?: string) {
    const target = institutionId
      ? this.server.to(`institution:${institutionId}`).to('role:SUPER_ADMIN')
      : this.server.to('role:SUPER_ADMIN');
    target.emit(event, payload);
  }
}