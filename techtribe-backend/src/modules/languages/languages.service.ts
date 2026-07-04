import { prisma } from '../../config/prisma';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';

const LIST_CACHE_KEY = 'languages:list';
const DETAIL_CACHE_PREFIX = 'languages:detail:';
const CACHE_TTL = 60 * 60; // 1h — tutorial content changes rarely

export async function listLanguages() {
  const cached = await cacheGet(LIST_CACHE_KEY);
  if (cached) return cached;

  const languages = await prisma.language.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, name: true, version: true, icon: true, color: true, tags: true }
  });
  await cacheSet(LIST_CACHE_KEY, languages, CACHE_TTL);
  return languages;
}

export async function getLanguageBySlug(slug: string) {
  const cacheKey = `${DETAIL_CACHE_PREFIX}${slug}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const language = await prisma.language.findUnique({
    where: { slug },
    include: { sections: { orderBy: { order: 'asc' } } }
  });
  if (!language) throw ApiError.notFound('Language not found');

  await cacheSet(cacheKey, language, CACHE_TTL);
  return language;
}

async function invalidateCache(slug?: string) {
  await cacheDelPattern(`${LIST_CACHE_KEY}*`);
  if (slug) await cacheDelPattern(`${DETAIL_CACHE_PREFIX}${slug}*`);
}

export async function createLanguage(data: {
  slug: string;
  name: string;
  version?: string;
  icon?: string;
  color?: string;
  description: string;
  uses?: string;
  tags: string[];
}) {
  const language = await prisma.language.create({ data });
  await invalidateCache();
  return language;
}

export async function updateLanguage(slug: string, data: Partial<{
  name: string; version: string; icon: string; color: string; description: string; uses: string; tags: string[];
}>) {
  const existing = await prisma.language.findUnique({ where: { slug } });
  if (!existing) throw ApiError.notFound('Language not found');
  const language = await prisma.language.update({ where: { slug }, data });
  await invalidateCache(slug);
  return language;
}

export async function deleteLanguage(slug: string) {
  const existing = await prisma.language.findUnique({ where: { slug } });
  if (!existing) throw ApiError.notFound('Language not found');
  await prisma.language.delete({ where: { slug } });
  await invalidateCache(slug);
}

export async function upsertSection(
  slug: string,
  data: { key: string; title: string; codeHtml: string; order: number }
) {
  const language = await prisma.language.findUnique({ where: { slug } });
  if (!language) throw ApiError.notFound('Language not found');

  const section = await prisma.languageSection.upsert({
    where: { languageId_key: { languageId: language.id, key: data.key } },
    create: { ...data, languageId: language.id },
    update: data
  });
  await invalidateCache(slug);
  return section;
}

export async function deleteSection(slug: string, key: string) {
  const language = await prisma.language.findUnique({ where: { slug } });
  if (!language) throw ApiError.notFound('Language not found');
  await prisma.languageSection
    .delete({ where: { languageId_key: { languageId: language.id, key } } })
    .catch(() => {
      throw ApiError.notFound('Section not found');
    });
  await invalidateCache(slug);
}
