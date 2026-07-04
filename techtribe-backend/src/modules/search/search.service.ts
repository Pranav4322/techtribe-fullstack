import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';

export async function globalSearch(query: string, userId?: string) {
  if (!query || query.trim().length < 2) {
    throw ApiError.badRequest('Search query must be at least 2 characters');
  }
  const q = query.trim();

  const [news, posts, languages, challenges, roadmaps, users] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
      orderBy: { publishedAt: 'desc' },
      take: 8
    }),
    prisma.communityPost.findMany({
      where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { author: { select: { username: true, displayName: true, avatarUrl: true } } }
    }),
    prisma.language.findMany({
      where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] },
      take: 8
    }),
    prisma.challenge.findMany({
      where: {
        isPublished: true,
        OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]
      },
      take: 8
    }),
    prisma.roadmap.findMany({
      where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { goal: { contains: q, mode: 'insensitive' } }] },
      take: 8
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }]
      },
      take: 8,
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true }
    })
  ]);

  return {
    query: q,
    results: { news, posts, languages, challenges, roadmaps, users },
    totalCount: news.length + posts.length + languages.length + challenges.length + roadmaps.length + users.length
  };
}
