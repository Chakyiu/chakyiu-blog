/**
 * Shared TypeScript types for the entire application
 * These types define the contract between Server Actions, API routes, and components
 * All Server Actions MUST return ActionResult<T>
 */

/**
 * Standard Server Action return type
 * ALL Server Actions throughout the app must return this type
 * @template T The data type returned on success (void if no data)
 */
export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Public user view (no sensitive fields like password hash)
 * Used when displaying user info in posts, comments, notifications
 */
export type UserView = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "user";
  createdAt: number; // Unix timestamp (milliseconds)
};

/**
 * Tag view with optional post count
 * Used in post lists and tag cloud displays
 */
export type TagView = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  postCount?: number;
};

/**
 * Complete post view with author, tags, and comment metadata
 * Decouples API shape from DB schema
 * renderedContent is pre-rendered HTML to avoid client-side markdown parsing
 */
export type PostView = {
  id: string;
  title: string;
  slug: string;
  content: string;          // raw markdown
  renderedContent: string;  // pre-rendered HTML
  excerpt: string | null;
  coverImageUrl: string | null;
  author: UserView;
  status: "draft" | "published" | "archived";
  tags: TagView[];
  commentCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

/**
 * Comment view with nested reply structure
 * replies contains direct child replies only (one level of nesting)
 */
export type CommentView = {
  id: string;
  content: string;          // raw markdown
  renderedContent: string;  // pre-rendered HTML
  postId: string;
  author: UserView;
  parentId: string | null;
  hidden: boolean;
  createdAt: number;
  replies?: CommentView[];  // direct replies (one level only)
};

/**
 * Notification view for user notifications
 * type indicates the notification category
 * referenceId links to the relevant object (post, comment, user, etc.)
 */
export type NotificationView = {
  id: string;
  type: "reply" | "comment_hidden" | "comment_deleted" | "role_changed";
  message: string;
  referenceId: string | null;
  read: boolean;
  createdAt: number;
};

/**
 * Generic paginated result wrapper
 * totalPages is calculated as Math.ceil(total / pageSize)
 */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Full-text search result with relevance score
 * snippet is FTS5 highlighted snippet from the search engine
 */
export type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  snippet: string;          // FTS5 highlighted snippet
  relevanceScore: number;
  publishedAt: number | null;
  author: UserView;
  tags: TagView[];
};

/**
 * Session user type (extended from Auth.js session)
 * Used in getServerSession() and middleware
 */
export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "user";
};

/**
 * Post filter options for list queries
 * Used in Server Actions that fetch posts
 */
export type PostFilters = {
  tag?: string;           // tag slug
  status?: "draft" | "published" | "archived";
  authorId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Project view with author info
 * renderedReadme is pre-rendered HTML from the GitHub README
 */
export type ProjectView = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  githubUrl: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  cachedReadme: string | null;
  renderedReadme: string | null;
  readmeUpdatedAt: number | null;
  author: UserView;
  status: "draft" | "published" | "archived";
  createdAt: number;
  updatedAt: number;
};