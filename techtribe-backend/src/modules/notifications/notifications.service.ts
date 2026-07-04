import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { ApiError } from '../../utils/ApiError';

interface CreateNotificationInput {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  message: string;
  link?: string;
}

export async function notifyUser(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.recipientId) return null; // don't notify yourself
  return prisma.notification.create({ data: input });
}

export async function listNotifications(userId: string, query: { page?: string; limit?: string; unreadOnly?: string }) {
  const pagination = parsePagination(query);
  const where = { recipientId: userId, ...(query.unreadOnly === 'true' ? { isRead: false } : {}) };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    }),
    prisma.notification.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== userId) throw ApiError.notFound('Notification not found');
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
}

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.recipientId !== userId) throw ApiError.notFound('Notification not found');
  await prisma.notification.delete({ where: { id: notificationId } });
}
