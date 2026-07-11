import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { notifyUser } from '../notifications/notifications.service';

const AUTHOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true
} as const;

export async function listPosts(query: {
  page?: string;
  limit?: string;
  tag?: string;
  sort?: 'newest' | 'oldest' | 'popular';
  userId?: string;
}) {
  const pagination = parsePagination(query);
  const where: Prisma.CommunityPostWhereInput = query.tag ? { tags: { has: query.tag } } : {};

  const orderBy: Prisma.CommunityPostOrderByWithRelationInput =
    query.sort === 'oldest'
      ? { createdAt: 'asc' }
      : query.sort === 'popular'
        ? { likes: { _count: 'desc' } }
        : { createdAt: 'desc' };

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, orderBy],
      skip: pagination.skip,
      take: pagination.take,
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true, likes: true } }
      }
    }),
    prisma.communityPost.count({ where })
  ]);

  let likedIds = new Set<string>();
  if (query.userId) {
    const likes = await prisma.like.findMany({
      where: { userId: query.userId, postId: { in: posts.map((p: { id: string }) => p.id) } }
    });
    likedIds = new Set(likes.map((l: { postId: string | null }) => l.postId as string));
  }

  const enriched = posts.map((p: (typeof posts)[number]) => ({
    ...p,
    commentCount: p._count.comments,
    likeCount: p._count.likes,
    isLiked: likedIds.has(p.id),
    _count: undefined
  }));

  return buildPaginatedResult(enriched, total, pagination);
}

export async function getPost(id: string, userId?: string) {
  const post = await prisma.communityPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { comments: true, likes: true } }
    }
  }).catch(() => {
    throw ApiError.notFound('Post not found');
  });

  const isLiked = userId
    ? Boolean(await prisma.like.findUnique({ where: { userId_postId: { userId, postId: id } } }))
    : false;

  return { ...post, commentCount: post._count.comments, likeCount: post._count.likes, isLiked };
}

export async function createPost(authorId: string, data: { title: string; body: string; tags: string[] }) {
  return prisma.communityPost.create({
    data: { ...data, authorId },
    include: { author: { select: AUTHOR_SELECT } }
  });
}

export async function updatePost(postId: string, userId: string, isAdmin: boolean, data: Partial<{ title: string; body: string; tags: string[] }>) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId && !isAdmin) throw ApiError.forbidden('You can only edit your own posts');
  return prisma.communityPost.update({ where: { id: postId }, data });
}

export async function deletePost(postId: string, userId: string, isAdmin: boolean) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) throw ApiError.notFound('Post not found');
  if (post.authorId !== userId && !isAdmin) throw ApiError.forbidden('You can only delete your own posts');
  await prisma.communityPost.delete({ where: { id: postId } });
}

export async function listComments(postId: string, userId?: string) {
  const comments = await prisma.comment.findMany({
    where: { postId, parentCommentId: null, isDeleted: false },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true } },
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: AUTHOR_SELECT }, _count: { select: { likes: true } } }
      }
    }
  });

  if (!userId) {
    return comments.map((c: (typeof comments)[number]) => mapComment(c));
  }

  const allIds = comments.flatMap((c: (typeof comments)[number]) => [
    c.id,
    ...c.replies.map((r: (typeof c.replies)[number]) => r.id)
  ]);
  const likes = await prisma.like.findMany({ where: { userId, commentId: { in: allIds } } });
  const likedSet = new Set<string>(likes.map((l: { commentId: string | null }) => l.commentId as string));
  return comments.map((c: (typeof comments)[number]) => mapComment(c, likedSet));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(c: any, likedSet?: Set<string>) {
  return {
    ...c,
    likeCount: c._count.likes,
    isLiked: likedSet?.has(c.id) ?? false,
    replies: (c.replies || []).map((r: any) => ({
      ...r,
      likeCount: r._count.likes,
      isLiked: likedSet?.has(r.id) ?? false,
      _count: undefined
    })),
    _count: undefined
  };
}

export async function createComment(
  authorId: string,
  input: { postId?: string; newsArticleId?: string; body: string; parentCommentId?: string }
) {
  if (!input.postId && !input.newsArticleId) {
    throw ApiError.badRequest('A comment must target a post or news article');
  }

  const comment = await prisma.comment.create({
    data: {
      authorId,
      postId: input.postId,
      newsArticleId: input.newsArticleId,
      parentCommentId: input.parentCommentId,
      body: input.body
    },
    include: { author: { select: AUTHOR_SELECT } }
  });

  // Notify post author (if not commenting on own post) and parent comment author (if a reply)
  if (input.postId) {
    const post = await prisma.communityPost.findUnique({ where: { id: input.postId } });
    if (post && post.authorId !== authorId) {
      await notifyUser({
        recipientId: post.authorId,
        actorId: authorId,
        type: 'COMMENT',
        message: 'commented on your post',
        link: `/community/posts/${post.id}`
      });
    }
  }
  if (input.parentCommentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentCommentId } });
    if (parent && parent.authorId !== authorId) {
      await notifyUser({
        recipientId: parent.authorId,
        actorId: authorId,
        type: 'REPLY',
        message: 'replied to your comment',
        link: input.postId ? `/community/posts/${input.postId}` : undefined
      });
    }
  }

  return comment;
}

export async function updateComment(commentId: string, userId: string, isAdmin: boolean, body: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.authorId !== userId && !isAdmin) throw ApiError.forbidden('You can only edit your own comments');
  return prisma.comment.update({ where: { id: commentId }, data: { body, isEdited: true } });
}

export async function deleteComment(commentId: string, userId: string, isAdmin: boolean) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.authorId !== userId && !isAdmin) throw ApiError.forbidden('You can only delete your own comments');
  // Soft delete to preserve thread structure
  await prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true, body: '[deleted]' } });
}

export async function togglePostLike(userId: string, postId: string) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) throw ApiError.notFound('Post not found');

  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });
  let liked: boolean;
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.like.create({ data: { userId, postId } });
    liked = true;
    if (post.authorId !== userId) {
      await notifyUser({
        recipientId: post.authorId,
        actorId: userId,
        type: 'LIKE',
        message: 'liked your post',
        link: `/community/posts/${postId}`
      });
    }
  }
  const likeCount = await prisma.like.count({ where: { postId } });
  return { liked, likeCount };
}

export async function toggleCommentLike(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw ApiError.notFound('Comment not found');

  const existing = await prisma.like.findUnique({ where: { userId_commentId: { userId, commentId } } });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await prisma.like.create({ data: { userId, commentId } });
  return { liked: true };
}

export async function togglePostBookmark(userId: string, postId: string) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) throw ApiError.notFound('Post not found');

  const existing = await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({ data: { userId, postId, contentType: 'COMMUNITY_POST' } });
  return { bookmarked: true };
}

export async function reportContent(
  reporterId: string,
  input: { postId?: string; commentId?: string; reportedUserId?: string; reason: string; details?: string }
) {
  if (!input.postId && !input.commentId && !input.reportedUserId) {
    throw ApiError.badRequest('A report must target a post, comment, or user');
  }
  return prisma.report.create({
    data: {
      reporterId,
      postId: input.postId,
      commentId: input.commentId,
      reportedUserId: input.reportedUserId,
      reason: input.reason,
      details: input.details
    }
  });
}

/**
 * Aggregates real post counts per tag, unnesting the Postgres text[] column,
 * so the "Communities" sidebar shows genuine live data instead of static
 * placeholder numbers.
 */
export async function getTopTags(limit = 6) {
  const rows = await prisma.$queryRaw<{ tag: string; count: bigint }[]>`
    SELECT unnest(tags) AS tag, COUNT(*) AS count
    FROM "CommunityPost"
    GROUP BY tag
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  return rows.map((r: { tag: string; count: bigint }) => ({ tag: r.tag, count: Number(r.count) }));
}
