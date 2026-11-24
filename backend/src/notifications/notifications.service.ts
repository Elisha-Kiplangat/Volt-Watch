import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.module';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, pageSize = 25) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * take, take }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data: { items, total, page: Math.max(1, page), pageSize: take } };
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    if (!result.count) throw new NotFoundException('Notification was not found.');
    return { data: { id, isRead: true } };
  }
}