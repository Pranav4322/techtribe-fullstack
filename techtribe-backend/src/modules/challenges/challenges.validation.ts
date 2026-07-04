import { z } from 'zod';

export const createChallengeSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(150),
  description: z.string().min(10),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  languageTags: z.array(z.string()).max(10).default([]),
  starterCode: z.string().optional(),
  constraints: z.string().optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().default(false)
      })
    )
    .min(1)
});

export const submitSolutionSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(40)
});
