export const runtime = 'nodejs'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toRFC822(date: Date): string {
  return date.toUTCString()
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chakyiu.blog'

    const posts = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        slug: schema.posts.slug,
        excerpt: schema.posts.excerpt,
        content: schema.posts.content,
        publishedAt: schema.posts.publishedAt,
        authorName: schema.users.name,
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .where(eq(schema.posts.status, 'published'))
      .orderBy(desc(schema.posts.publishedAt))
      .limit(20)

    const items = posts
      .map((post) => {
        const link = `${baseUrl}/posts/${post.slug}`
        const guid = link
        const pubDate = post.publishedAt ? toRFC822(new Date(post.publishedAt)) : ''
        const description = post.excerpt || post.content.slice(0, 200)
        const author = post.authorName || 'ChaKyiu'

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid>${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      <author>${author}</author>
    </item>`
      })
      .join('\n')

    const now = new Date()
    const lastBuildDate = toRFC822(now)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ChaKyiu Blog</title>
    <link>${baseUrl}</link>
    <description>IT Developer Blog</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('RSS feed error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
