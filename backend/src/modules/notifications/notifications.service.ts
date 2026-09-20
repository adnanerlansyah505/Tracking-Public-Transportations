import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { NotificationsGateway } from './notifications.gateway';
import { UserRepository } from '../users/users.repository';
import { UserRole } from '../auth/decorators/roles.decorator';
import { ListNotificationsDTO } from './dto/list-notifications.dto';

/** Kinds of in-app notification the app can raise. */
export type NotificationType =
  | 'route_request.created'
  | 'route_request.approved'
  | 'route_request.rejected'
  | 'driver_request.created'
  | 'driver_request.approved'
  | 'driver_request.rejected'
  | 'driver_registered'
  | 'passenger_search.created'
  | 'nearby_angkot.found'
  | 'driver_online.nearby';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly gateway: NotificationsGateway,
    private readonly users: UserRepository,
  ) {}

  /** Persist a notification for one user and push it live. */
  async notify(userId: string, payload: NotificationPayload) {
    const row = await this.repository.create({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      data: payload.data ?? null,
    });

    if (row) this.gateway.emitToUser(userId, row);

    return row;
  }

  /** Fan a notification out to every administrator. */
  async notifyAdmins(payload: NotificationPayload) {
    const adminIds = await this.users.findIdsByRole(UserRole.Admin);
    if (adminIds.length === 0) return [];

    const rows = await this.repository.createMany(
      adminIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        data: payload.data ?? null,
      })),
    );

    for (const row of rows) this.gateway.emitToUser(row.userId, row);

    return rows;
  }

  async list(userId: string, query: ListNotificationsDTO) {
    const { limit, offset } = query;

    const [items, unread, total] = await Promise.all([
      this.repository.listForUser(userId, limit, offset),
      this.repository.countUnread(userId),
      this.repository.countForUser(userId),
    ]);

    return {
      notifications: items,
      unread,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async unreadCount(userId: string) {
    return { unread: await this.repository.countUnread(userId) };
  }

  async markRead(userId: string, id: string) {
    const row = await this.repository.markRead(userId, id);
    if (!row) throw new NotFoundException('Notification not found.');
    return row;
  }

  async markAllRead(userId: string) {
    await this.repository.markAllRead(userId);
    return { message: 'All notifications marked as read.' };
  }

  /** Clear one notification. Works the same for admins, drivers and passengers. */
  async remove(userId: string, id: string) {
    const row = await this.repository.remove(userId, id);
    if (!row) throw new NotFoundException('Notification not found.');

    return { id: row.id, unread: await this.repository.countUnread(userId) };
  }
}
