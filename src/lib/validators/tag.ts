import { z } from 'zod'

export const TAG_COLOR_PALETTE = [
  '#e4e669',
  '#d93f0b',
  '#0075ca',
  '#cfd3d7',
  '#a2eeef',
  '#7057ff',
  '#008672',
  '#e11d48',
  '#0e8a16',
  '#1d76db',
  '#5319e7',
  '#b60205',
] as const

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less')
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color'),
})

export const updateTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less')
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color'),
})

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
