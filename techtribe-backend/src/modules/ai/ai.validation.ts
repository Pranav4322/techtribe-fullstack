import { z } from 'zod';

export const quizSchema = z.object({
  language: z.string().min(1).max(50),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner')
});

export const summarySchema = z.object({
  content: z.string().min(20, 'Please provide at least 20 characters of content to summarize').max(15000)
});

export const pathSchema = z.object({
  goal: z.string().min(3).max(200),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner')
});

export const reviewSchema = z.object({
  code: z.string().min(5, 'Please provide some code to review').max(15000)
});

export const quickAskSchema = z.object({
  question: z.string().min(3).max(2000)
});
