/**
 * Application-wide constants
 * Centralized configuration for pagination, limits, paths, and other settings
 */

// Pagination
export const POSTS_PER_PAGE = 20;
export const COMMENTS_PER_PAGE = 30;
export const SEARCH_RESULTS_PER_PAGE = 20;

// Content limits
export const MAX_POST_CONTENT_SIZE = 100_000; // 100KB markdown
export const MAX_COMMENT_LENGTH = 5_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TAG_NAME_LENGTH = 50;
export const MAX_EXCERPT_LENGTH = 300;

// Image limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Auth
export const MIN_PASSWORD_LENGTH = 8;

// Paths
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./data/uploads";
export const DB_PATH = process.env.DATABASE_URL ?? "./data/sqlite.db";
