import { z } from 'zod'

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  content: z
    .string()
    .min(1, 'Content is required'),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be 500 characters or less')
    .trim()
    .optional()
    .nullable(),
  coverImageUrl: z
    .string()
    .refine(
      (val) => val.startsWith('/api/uploads/') || z.string().url().safeParse(val).success,
      'Cover image must be a valid URL or an uploaded file path'
    )
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published', 'archived'])
    .default('draft'),
  tagIds: z
    .array(z.string().min(1))
    .optional()
    .default([]),
})

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim()
    .optional(),
  content: z
    .string()
    .min(1, 'Content is required')
    .optional(),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be 500 characters or less')
    .trim()
    .optional()
    .nullable(),
  coverImageUrl: z
    .string()
    .refine(
      (val) => val.startsWith('/api/uploads/') || z.string().url().safeParse(val).success,
      'Cover image must be a valid URL or an uploaded file path'
    )
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional(),
  tagIds: z
    .array(z.string().min(1))
    .optional(),
})

export const changePostStatusSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  status: z.enum(['draft', 'published', 'archived']),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type ChangePostStatusInput = z.infer<typeof changePostStatusSchema>
