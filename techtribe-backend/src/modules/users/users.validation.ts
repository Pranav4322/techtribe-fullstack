import { z } from 'zod';

// Accepts either a normal https URL or a base64 data URL (for uploaded
// avatars), capped at ~1.2MB of actual image data — avatars are small and
// don't need the same headroom as post images.
const avatarUrlSchema = z
  .string()
  .max(1_700_000, 'Avatar image is too large (max ~1.2MB)')
  .refine((val) => val === '' || /^https?:\/\//.test(val) || /^data:image\/(png|jpe?g|gif|webp);base64,/.test(val), {
    message: 'Avatar must be a valid image URL or uploaded image'
  })
  .optional();

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(280).optional(),
  location: z.string().max(100).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  avatarUrl: avatarUrlSchema
});

export const usernameParamSchema = z.object({
  username: z.string().min(1)
});
