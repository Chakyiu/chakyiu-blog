import { z } from 'zod'

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),
  githubUrl: z
    .string()
    .url('GitHub URL must be a valid URL')
    .regex(/^https:\/\/github\.com\//, 'Must be a GitHub URL (https://github.com/...)')
    .optional()
    .nullable(),
  productUrl: z
    .string()
    .url('Product URL must be a valid URL')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .refine(
      (val) => val.startsWith('/api/uploads/') || z.string().url().safeParse(val).success,
      'Image URL must be a valid URL or an uploaded file path'
    )
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published', 'archived'])
    .default('draft'),
})

export const updateProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),
  githubUrl: z
    .string()
    .url('GitHub URL must be a valid URL')
    .regex(/^https:\/\/github\.com\//, 'Must be a GitHub URL (https://github.com/...)')
    .optional()
    .nullable(),
  productUrl: z
    .string()
    .url('Product URL must be a valid URL')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .refine(
      (val) => val.startsWith('/api/uploads/') || z.string().url().safeParse(val).success,
      'Image URL must be a valid URL or an uploaded file path'
    )
    .optional()
    .nullable(),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
