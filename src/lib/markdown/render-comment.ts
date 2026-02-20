import 'server-only'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShiki from '@shikijs/rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { commentSanitizeSchema } from './sanitize'

export async function renderCommentMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } })
    .use(rehypeSanitize, commentSanitizeSchema)   // AFTER shiki — CRITICAL ORDER
    .use(rehypeStringify)
    .process(content)
  return String(result)
}
