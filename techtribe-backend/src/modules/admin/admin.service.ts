import { Role, ReportStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { notifyUser } from '../notifications/notifications.service';

async function logAction(actorId: string, action: string, targetType: string, targetId: string, metadata?: object) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, metadata } });
}

export async function getPlatformStats() {
  const [
    totalUsers,
    activeToday,
    totalPosts,
    totalComments,
    totalChallenges,
    totalSubmissions,
    totalRoadmaps,
    openReports,
    newUsersThisWeek
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.communityPost.count(),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.challenge.count(),
    prisma.challengeSubmission.count(),
    prisma.roadmap.count(),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
  ]);

  return {
    totalUsers,
    activeToday,
    newUsersThisWeek,
    totalPosts,
    totalComments,
    totalChallenges,
    totalSubmissions,
    totalRoadmaps,
    openReports
  };
}

export async function listUsers(query: { page?: string; limit?: string; search?: string; role?: string }) {
  const pagination = parsePagination(query);
  const where = {
    ...(query.role ? { role: query.role as Role } : {}),
    ...(query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { displayName: { contains: query.search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        isBanned: true,
        bannedReason: true,
        isEmailVerified: true,
        createdAt: true,
        lastActiveAt: true
      }
    }),
    prisma.user.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}

export async function banUser(adminId: string, userId: string, reason: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.role === 'ADMIN') throw ApiError.forbidden('Cannot ban another admin');

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isBanned: true, bannedReason: reason } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);
  await logAction(adminId, 'USER_BANNED', 'User', userId, { reason });
}

export async function unbanUser(adminId: string, userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw ApiError.notFound('User not found');
  await prisma.user.update({ where: { id: userId }, data: { isBanned: false, bannedReason: null } });
  await logAction(adminId, 'USER_UNBANNED', 'User', userId);
}

export async function updateUserRole(adminId: string, userId: string, role: Role) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw ApiError.notFound('User not found');
  const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAction(adminId, 'USER_ROLE_CHANGED', 'User', userId, { newRole: role });
  return updated;
}

export async function listReports(query: { page?: string; limit?: string; status?: string }) {
  const pagination = parsePagination(query);
  const where = { status: (query.status as ReportStatus) || 'OPEN' };

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        reporter: { select: { username: true, displayName: true } },
        reportedUser: { select: { username: true, displayName: true } },
        post: { select: { id: true, title: true } },
        comment: { select: { id: true, body: true } }
      }
    }),
    prisma.report.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}

export async function resolveReport(adminId: string, reportId: string, status: ReportStatus, resolvedNote?: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw ApiError.notFound('Report not found');
  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status, resolvedNote, resolvedAt: new Date() }
  });
  await logAction(adminId, 'REPORT_RESOLVED', 'Report', reportId, { status, resolvedNote });
  return updated;
}

export async function broadcastAnnouncement(adminId: string, message: string, link?: string) {
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u: { id: string }) => ({
      recipientId: u.id,
      actorId: adminId,
      type: 'ADMIN_ANNOUNCEMENT' as const,
      message,
      link
    }))
  });
  await logAction(adminId, 'ANNOUNCEMENT_BROADCAST', 'System', 'all-users', { message, recipientCount: users.length });
  return { recipientCount: users.length };
}

export async function getAuditLog(query: { page?: string; limit?: string }) {
  const pagination = parsePagination(query);
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { actor: { select: { username: true, displayName: true } } }
    }),
    prisma.auditLog.count()
  ]);
  return buildPaginatedResult(items, total, pagination);
}

// re-export for controller convenience
export { notifyUser };
