import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

const PUBLIC_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  location: true,
  websiteUrl: true,
  githubUrl: true,
  twitterUrl: true,
  role: true,
  xp: true,
  level: true,
  streakCount: true,
  createdAt: true
} as const;

export async function getPublicProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: PUBLIC_SELECT });
  if (!user) throw ApiError.notFound('User not found');

  const [followerCount, followingCount, postCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.communityPost.count({ where: { authorId: user.id } }),
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } }
        })
      : Promise.resolve(null)
  ]);

  return { ...user, followerCount, followingCount, postCount, isFollowing: Boolean(isFollowing) };
}

export async function updateProfile(userId: string, data: Record<string, unknown>) {
  const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== ''));
  const user = await prisma.user.update({ where: { id: userId }, data: cleaned, select: PUBLIC_SELECT });
  return user;
}

export async function followUser(followerId: string, targetUsername: string) {
  const target = await prisma.user.findUnique({ where: { username: targetUsername } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === followerId) throw ApiError.badRequest('You cannot follow yourself');

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    create: { followerId, followingId: target.id },
    update: {}
  });

  await prisma.notification.create({
    data: {
      recipientId: target.id,
      actorId: followerId,
      type: 'FOLLOW',
      message: 'started following you',
      link: `/profile`
    }
  });
}

export async function unfollowUser(followerId: string, targetUsername: string) {
  const target = await prisma.user.findUnique({ where: { username: targetUsername } });
  if (!target) throw ApiError.notFound('User not found');
  await prisma.follow
    .delete({ where: { followerId_followingId: { followerId, followingId: target.id } } })
    .catch(() => undefined);
}

export async function getDashboardStats(userId: string) {
  const [
    postCount,
    commentCount,
    bookmarkCount,
    noteCount,
    challengeSubmissions,
    mcqAttempts,
    roadmapProgress,
    unreadNotifications,
    user
  ] = await Promise.all([
    prisma.communityPost.count({ where: { authorId: userId } }),
    prisma.comment.count({ where: { authorId: userId, isDeleted: false } }),
    prisma.bookmark.count({ where: { userId } }),
    prisma.note.count({ where: { userId, isArchived: false } }),
    prisma.challengeSubmission.count({ where: { userId, status: 'ACCEPTED' } }),
    prisma.mcqAttempt.count({ where: { userId, completedAt: { not: null } } }),
    prisma.userRoadmapProgress.count({ where: { userId } }),
    prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, streakCount: true } })
  ]);

  return {
    xp: user?.xp ?? 0,
    level: user?.level ?? 1,
    streakCount: user?.streakCount ?? 0,
    postCount,
    commentCount,
    bookmarkCount,
    noteCount,
    challengesSolved: challengeSubmissions,
    mcqAttemptsCompleted: mcqAttempts,
    roadmapsInProgress: roadmapProgress,
    unreadNotifications
  };
}

/**
 * Real top-contributor leaderboard by XP, for the "Top Contributors"
 * sidebar (replaces static placeholder data). Badge tier is derived from
 * XP thresholds rather than a stored field.
 */
export async function getLeaderboard(limit = 3) {
  const users = await prisma.user.findMany({
    where: { isActive: true, isBanned: false },
    orderBy: { xp: 'desc' },
    take: limit,
    select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true, level: true }
  });

  return users.map((u: (typeof users)[number]) => ({
    ...u,
    badge: u.xp >= 4000 ? 'Expert' : u.xp >= 2000 ? 'Pro' : 'Builder'
  }));
}
