import { prisma } from '../../config/prisma';
import { cacheGet, cacheSet } from '../../config/redis';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';
import { NEWS_CATEGORIES, VALID_CATEGORIES, secondsUntilNextNewsCheckpoint } from './news.constants';

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  tag_list: string[];
  reading_time_minutes: number;
  public_reactions_count: number;
  comments_count: number;
  cover_image: string | null;
}

interface HnHit {
  objectID: string;
  title: string;
  story_text: string | null;
  url: string | null;
  created_at: string;
  points: number;
  num_comments: number;
}

async function fetchFromDevTo(tag: string, perPage = 12): Promise<DevToArticle[]> {
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&top=1&per_page=${perPage}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Dev.to fetch failed for tag ${tag}: ${res.status}`);
  const json = (await res.json()) as DevToArticle[];
  if (!Array.isArray(json)) throw new Error(`Dev.to unexpected response for tag ${tag}`);
  return json;
}

async function fetchFromHN(query: string, perPage = 12): Promise<HnHit[]> {
  const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=${perPage}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HN fetch failed: ${res.status}`);
  const json = (await res.json()) as { hits: HnHit[] };
  return json.hits || [];
}

/** Fetches upstream articles for a category (Dev.to primary, HN fallback) and upserts into Postgres. */
async function refreshCategory(categoryKey: string): Promise<void> {
  const cfg = NEWS_CATEGORIES[categoryKey];
  if (!cfg) return;

  let records: Array<{
    externalId: string;
    source: string;
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
    publishedAt: Date;
    tagList: string[];
    readingTimeMinutes: number;
    externalReactionCount: number;
    externalCommentCount: number;
  }> = [];

  try {
    const articles = await fetchFromDevTo(cfg.devToTag);
    records = articles.map((a) => ({
      externalId: `devto-${a.id}`,
      source: 'devto',
      title: a.title,
      description: a.description || '',
      url: a.url,
      imageUrl: a.cover_image,
      publishedAt: new Date(a.published_at),
      tagList: a.tag_list || [],
      readingTimeMinutes: a.reading_time_minutes || 3,
      externalReactionCount: a.public_reactions_count || 0,
      externalCommentCount: a.comments_count || 0
    }));
  } catch (err) {
    logger.warn(`Dev.to unavailable for "${categoryKey}", falling back to Hacker News: ${(err as Error).message}`);
    try {
      const hits = await fetchFromHN(cfg.hnQuery);
      records = hits
        .filter((h) => h.title)
        .map((h) => ({
          externalId: `hn-${h.objectID}`,
          source: 'hackernews',
          title: h.title,
          description: (h.story_text || '').slice(0, 300) || 'Discussion on Hacker News.',
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          imageUrl: null,
          publishedAt: new Date(h.created_at),
          tagList: ['hackernews'],
          readingTimeMinutes: 3,
          externalReactionCount: h.points || 0,
          externalCommentCount: h.num_comments || 0
        }));
    } catch (hnErr) {
      logger.error(`Both Dev.to and HN failed for category "${categoryKey}": ${(hnErr as Error).message}`);
      return; // leave existing DB rows as-is
    }
  }

  await Promise.all(
    records.map((r) =>
      prisma.newsArticle.upsert({
        where: { externalId: r.externalId },
        create: { ...r, category: categoryKey },
        update: { ...r, fetchedAt: new Date() }
      })
    )
  );
}

async function ensureCategoryFresh(categoryKey: string, force = false): Promise<void> {
  const cacheKey = `news:fresh:${categoryKey}`;
  if (!force) {
    const isFresh = await cacheGet<boolean>(cacheKey);
    if (isFresh) return;
  }
  await refreshCategory(categoryKey);
  await cacheSet(cacheKey, true, secondsUntilNextNewsCheckpoint());
}

export async function listNews(params: {
  category?: string;
  page?: string;
  limit?: string;
  userId?: string;
  force?: boolean;
}) {
  const { category, force = false } = params;
  if (category && category !== 'all' && !VALID_CATEGORIES.includes(category)) {
    throw ApiError.badRequest(`Unknown category "${category}". Valid: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (category && category !== 'all') {
    await ensureCategoryFresh(category, force);
  } else {
    await Promise.all(VALID_CATEGORIES.map((c) => ensureCategoryFresh(c, force)));
  }

  const pagination = parsePagination(params);
  const where = category && category !== 'all' ? { category } : {};

  const [items, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.newsArticle.count({ where })
  ]);

  let likedIds = new Set<string>();
  let bookmarkedIds = new Set<string>();
  if (params.userId) {
    const [likes, bookmarks] = await Promise.all([
      prisma.like.findMany({ where: { userId: params.userId, newsArticleId: { in: items.map((i: { id: string }) => i.id) } } }),
      prisma.bookmark.findMany({ where: { userId: params.userId, newsArticleId: { in: items.map((i: { id: string }) => i.id) } } })
    ]);
    likedIds = new Set(likes.map((l: { newsArticleId: string | null }) => l.newsArticleId as string));
    bookmarkedIds = new Set(bookmarks.map((b: { newsArticleId: string | null }) => b.newsArticleId as string));
  }

  const enriched = items.map((item: (typeof items)[number]) => ({
    ...item,
    isLiked: likedIds.has(item.id),
    isBookmarked: bookmarkedIds.has(item.id)
  }));

  return buildPaginatedResult(enriched, total, pagination);
}

export async function getArticleById(id: string) {
  const article = await prisma.newsArticle.findUnique({ where: { id } });
  if (!article) throw ApiError.notFound('Article not found');
  return article;
}

export async function toggleLike(userId: string, articleId: string) {
  await getArticleById(articleId);
  const existing = await prisma.like.findUnique({
    where: { userId_newsArticleId: { userId, newsArticleId: articleId } }
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  await prisma.like.create({ data: { userId, newsArticleId: articleId } });
  return { liked: true };
}

export async function toggleBookmark(userId: string, articleId: string) {
  await getArticleById(articleId);
  const existing = await prisma.bookmark.findUnique({
    where: { userId_newsArticleId: { userId, newsArticleId: articleId } }
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({ data: { userId, newsArticleId: articleId, contentType: 'NEWS' } });
  return { bookmarked: true };
}

export function listCategories() {
  return VALID_CATEGORIES.map((key) => ({ key, label: NEWS_CATEGORIES[key].label }));
}
