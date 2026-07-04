import { prisma } from '../../config/prisma';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';

export async function listBookmarks(userId: string, query: { page?: string; limit?: string; type?: string }) {
  const pagination = parsePagination(query);
  const where = {
    userId,
    ...(query.type ? { contentType: query.type as import('@prisma/client').ContentType } : {})
  };

  const [items, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        newsArticle: true,
        post: { include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
        challenge: true,
        roadmap: true
      }
    }),
    prisma.bookmark.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}
