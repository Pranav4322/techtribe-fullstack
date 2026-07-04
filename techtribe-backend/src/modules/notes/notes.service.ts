import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { parsePagination, buildPaginatedResult } from '../../utils/pagination';

export async function listNotebooks(userId: string) {
  return prisma.notebook.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { notes: true } } }
  });
}

export async function createNotebook(userId: string, name: string, color?: string) {
  return prisma.notebook.create({ data: { userId, name, color } });
}

export async function deleteNotebook(userId: string, notebookId: string) {
  const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!notebook || notebook.userId !== userId) throw ApiError.notFound('Notebook not found');
  await prisma.notebook.delete({ where: { id: notebookId } });
}

export async function listNotes(
  userId: string,
  query: { page?: string; limit?: string; notebookId?: string; archived?: string; search?: string }
) {
  const pagination = parsePagination(query);
  const where = {
    userId,
    isArchived: query.archived === 'true',
    ...(query.notebookId ? { notebookId: query.notebookId } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { content: { contains: query.search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.note.count({ where })
  ]);

  return buildPaginatedResult(items, total, pagination);
}

export async function getNote(userId: string, noteId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.userId !== userId) throw ApiError.notFound('Note not found');
  return note;
}

export async function createNote(
  userId: string,
  data: { title: string; content: string; notebookId?: string; tags: string[] }
) {
  return prisma.note.create({ data: { ...data, userId } });
}

export async function updateNote(userId: string, noteId: string, data: Record<string, unknown>) {
  await getNote(userId, noteId);
  return prisma.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(userId: string, noteId: string) {
  await getNote(userId, noteId);
  await prisma.note.delete({ where: { id: noteId } });
}
