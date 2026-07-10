import { z } from 'zod';

// Accepts a base64 data URL (e.g. "data:image/png;base64,...") capped at
// ~2MB of actual image data (base64 inflates size ~33%, so ~2.7M chars).
const imageUrlSchema = z
  .string()
  .max(2_800_000, 'Image is too large (max ~2MB)')
  .regex(/^data:image\/(png|jpe?g|gif|webp);base64,/, 'Image must be a valid base64 data URL')
  .optional();

export const createPostSchema = z.object({
  title: z.string().min(3).max(150),
  body: z.string().min(1).max(20000),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
  imageUrl: imageUrlSchema
});

export const updatePostSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  body: z.string().min(1).max(20000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  imageUrl: imageUrlSchema
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  parentCommentId: z.string().uuid().optional()
});

export const listPostsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).optional()
});

export const reportSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  reportedUserId: z.string().uuid().optional(),
  reason: z.string().min(3).max(200),
  details: z.string().max(1000).optional()
});
