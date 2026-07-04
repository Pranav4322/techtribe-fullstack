import { z } from 'zod';

export const createRoadmapSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(150),
  goal: z.string().min(3).max(200),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  description: z.string().min(1),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1),
        resources: z.array(z.string()).max(20).default([]),
        projectIdea: z.string().optional()
      })
    )
    .min(1)
});

export const generateRoadmapSchema = z.object({
  goal: z.string().min(3).max(200),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER')
});
