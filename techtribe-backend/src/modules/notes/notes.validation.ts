import { z } from 'zod';

export const createNotebookSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().max(30).optional()
});

export const createNoteSchema = z.object({
  title: z.string().min(1).max(150),
  content: z.string().min(1),
  notebookId: z.string().uuid().optional(),
  tags: z.array(z.string().max(30)).max(10).optional().default([])
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  content: z.string().min(1).optional(),
  notebookId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional()
});
