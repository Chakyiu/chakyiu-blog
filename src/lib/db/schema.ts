import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  passwordHash: text("passwordHash"),
  role: text("role", { enum: ["admin", "user"] })
    .default("user")
    .notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
});

// ── Auth.js Accounts ───────────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  }),
);

// ── Auth.js Sessions ───────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: text("id").notNull(),
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

// ── Auth.js Verification Tokens ────────────────────────────────────────────
export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// ── Posts ──────────────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  content: text("content").notNull(),
  renderedContent: text("renderedContent").notNull(),
  excerpt: text("excerpt"),
  coverImageUrl: text("coverImageUrl"),
  authorId: text("authorId").references(() => users.id),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .default("draft")
    .notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
  publishedAt: timestamp("publishedAt", { mode: "date", withTimezone: true }),
});

// ── Tags ───────────────────────────────────────────────────────────────────
export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  color: text("color").default("#6e7781").notNull(),
});

// ── Post Tags (junction) ───────────────────────────────────────────────────
export const postTags = pgTable(
  "postTags",
  {
    postId: text("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.tagId] }),
  }),
);

// ── Comments ───────────────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  renderedContent: text("renderedContent").notNull(),
  postId: text("postId")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("authorId").references(() => users.id),
  parentId: text("parentId"),
  hidden: boolean("hidden").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
});

// ── Notifications ──────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["reply", "comment_hidden", "comment_deleted", "role_changed"],
  }).notNull(),
  message: text("message").notNull(),
  referenceId: text("referenceId"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
});

// ── Images ─────────────────────────────────────────────────────────────────
export const images = pgTable("images", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("originalName").notNull(),
  mimeType: text("mimeType").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploadedBy").references(() => users.id),
  postId: text("postId").references(() => posts.id),
  createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
});

// ── Relations ──────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  posts: many(posts),
  comments: many(comments),
  notifications: many(notifications),
  images: many(images),
  projects: many(projects),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  postTags: many(postTags),
  comments: many(comments),
  images: many(images),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  uploader: one(users, { fields: [images.uploadedBy], references: [users.id] }),
  post: one(posts, { fields: [images.postId], references: [posts.id] }),
}));

// ── Projects ───────────────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  githubUrl: text('githubUrl'),
  imageUrl: text('imageUrl'),
  productUrl: text('productUrl'),
  cachedReadme: text('cachedReadme'),
  readmeUpdatedAt: timestamp('readmeUpdatedAt', { mode: 'date', withTimezone: true }),
  authorId: text('authorId').references(() => users.id),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .default('draft')
    .notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: timestamp('updatedAt', { mode: 'date', withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  author: one(users, { fields: [projects.authorId], references: [users.id] }),
}));
