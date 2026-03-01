'use server'

import 'server-only'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { SEARCH_RESULTS_PER_PAGE } from '@/lib/constants'
import type { ActionResult, SearchResult, UserView, TagView } from '@/types'

type FtsRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  authorId: string | null
  snippet: string
  score: number
}

export async function searchPosts(query: string): Promise<ActionResult<SearchResult[]>> {
  if (!query.trim()) return { success: true, data: [] }

  try {
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, ''))
      .filter(Boolean)
      .join(' & ')

    if (!tsQuery) return { success: true, data: [] }

    const rows = (await db.execute(sql`
      SELECT
        posts.id,
        posts.title,
        posts.slug,
        posts.excerpt,
        posts."publishedAt",
        posts."authorId",
        ts_headline('english', posts.content, to_tsquery('english', ${tsQuery}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') as snippet,
        ts_rank_cd(to_tsvector('english', posts.title || ' ' || posts.content),
          to_tsquery('english', ${tsQuery})) as score
      FROM posts
      WHERE
        to_tsvector('english', posts.title || ' ' || posts.content) @@ to_tsquery('english', ${tsQuery})
        AND posts.status = 'published'
      ORDER BY score DESC
      LIMIT ${SEARCH_RESULTS_PER_PAGE}
    `)) as FtsRow[]

    if (rows.length === 0) return { success: true, data: [] }

    const authorIds = [...new Set(rows.map((r) => r.authorId).filter(Boolean))] as string[]
    const authors =
      authorIds.length > 0
        ? await db.select().from(schema.users).where(inArray(schema.users.id, authorIds))
        : []
    const authorMap = new Map(authors.map((a) => [a.id, a]))

    const postIds = rows.map((r) => r.id)
    const postTagRows = await db
      .select({
        postId: schema.postTags.postId,
        tagId: schema.postTags.tagId,
        tagName: schema.tags.name,
        tagSlug: schema.tags.slug,
        tagColor: schema.tags.color,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, postIds))

    const tagsMap = new Map<string, TagView[]>()
    for (const row of postTagRows) {
      if (!tagsMap.has(row.postId)) tagsMap.set(row.postId, [])
      tagsMap.get(row.postId)!.push({
        id: row.tagId,
        name: row.tagName,
        slug: row.tagSlug,
        color: row.tagColor,
      })
    }

    const results: SearchResult[] = rows.map((row) => {
      const authorRaw = row.authorId ? authorMap.get(row.authorId) : null
      const author: UserView = authorRaw
        ? {
            id: authorRaw.id,
            name: authorRaw.name ?? null,
            email: authorRaw.email,
            image: authorRaw.image ?? null,
            role: authorRaw.role,
            createdAt: authorRaw.createdAt?.getTime() ?? 0,
          }
        : { id: '', name: 'Unknown', email: '', image: null, role: 'user', createdAt: 0 }

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        snippet: row.snippet,
        relevanceScore: row.score,
        publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
        author,
        tags: tagsMap.get(row.id) ?? [],
      }
    })

    return { success: true, data: results }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Search failed' }
  }
}
