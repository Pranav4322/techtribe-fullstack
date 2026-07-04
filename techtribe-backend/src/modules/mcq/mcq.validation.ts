import { z } from 'zod';

export const startAttemptSchema = z.object({
  categorySlug: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  questionCount: z.number().int().min(1).max(20).default(5)
});

export const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0)
});
