import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always serve fresh from DB
export const revalidate = 3600; // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://blog.chakyiu.dev";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Dynamic post routes
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await db
      .select({
        slug: schema.posts.slug,
        updatedAt: schema.posts.updatedAt,
        publishedAt: schema.posts.publishedAt,
      })
      .from(schema.posts)
      .where(eq(schema.posts.status, "published"))
      .orderBy(desc(schema.posts.publishedAt));

    postRoutes = posts.map((post) => ({
      url: `${baseUrl}/posts/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // Gracefully degrade if DB is unavailable
  }

  // Dynamic project routes
  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    const projects = await db
      .select({
        slug: schema.projects.slug,
        updatedAt: schema.projects.updatedAt,
      })
      .from(schema.projects)
      .where(eq(schema.projects.status, "published"))
      .orderBy(desc(schema.projects.updatedAt));

    projectRoutes = projects.map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: project.updatedAt
        ? new Date(project.updatedAt)
        : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // Gracefully degrade if DB is unavailable
  }

  return [...staticRoutes, ...postRoutes, ...projectRoutes];
}
