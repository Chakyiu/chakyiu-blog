import { z } from 'zod'

export const createCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment must be 5000 characters or less'),
})

export const createReplySchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  parentId: z.string().min(1, 'Parent comment ID is required'),
  content: z
    .string()
    .min(1, 'Reply cannot be empty')
    .max(5000, 'Reply must be 5000 characters or less'),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CreateReplyInput = z.infer<typeof createReplySchema>
