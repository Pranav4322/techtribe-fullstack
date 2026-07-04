import { z } from 'zod';

export const createLanguageSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(60),
  version: z.string().max(30).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(30).optional(),
  description: z.string().min(1),
  uses: z.string().optional(),
  tags: z.array(z.string()).max(10).optional().default([])
});

export const updateLanguageSchema = createLanguageSchema.partial();

export const upsertSectionSchema = z.object({
  key: z.string().min(1).max(40),
  title: z.string().min(1).max(100),
  codeHtml: z.string().min(1),
  order: z.number().int().optional().default(0)
});
