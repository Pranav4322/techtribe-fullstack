import { z } from 'zod';

export const banUserSchema = z.object({
  reason: z.string().min(3).max(300)
});

export const updateRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN'])
});

export const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED', 'REVIEWING']),
  resolvedNote: z.string().max(500).optional()
});

export const announcementSchema = z.object({
  message: z.string().min(3).max(500),
  link: z.string().optional()
});
