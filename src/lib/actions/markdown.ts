'use server'

import { renderMarkdown } from '@/lib/markdown/render'

/**
 * Server action to render markdown content for client-side preview
 * This wrappers allows client components to use the server-side markdown renderer
 * without importing server-only modules directly.
 */
export async function renderMarkdownAction(content: string): Promise<string> {
  if (!content) return ''
  return renderMarkdown(content)
}
