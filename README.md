# Chakyiu Blog

A developer blog built with Next.js 16 and Bun. It prioritizes speed, simplicity, and a clean reading experience.

## Features

- **Next.js 16 App Router**: High performance server components and layouts.
- **Markdown Support**: Write posts in Markdown with Shiki syntax highlighting.
- **Instant Search**: Full-text search powered by SQLite FTS5.
- **Complete Auth**: Email, password, and GitHub OAuth support via Auth.js v5.
- **Admin Dashboard**: Secure management of posts, tags, comments, and users.
- **Comments**: Built-in reply system with XSS protection.
- **Notifications**: Real-time alerts for user interactions.
- **Media Management**: Simple image upload system for blog posts.
- **SEO Ready**: Automated RSS 2.0 feed, Open Graph tags, and JSON-LD.
- **Theme Support**: Built-in dark and light modes.

## Tech Stack

- **Framework**: Next.js 16
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4 and shadcn/ui
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Auth.js v5
- **Icons**: Lucide React

## Prerequisites

- [Bun](https://bun.sh) v1.1 or higher
- Node.js v20 or higher

## Local Setup

Follow these steps to run the blog on your machine.

1. **Clone the repo**
   ```bash
   git clone https://github.com/chakyiu/chakyiu-blog.git
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your secrets.

4. **Prepare the database**
   ```bash
   bun run migrate
   ```

5. **Start development**
   ```bash
   bun run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see it live.

## Environment Variables

| Name | Description | Required |
|------|-------------|----------|
| `DATABASE_URL` | Path to your SQLite database file. Default is `.data/blog.db`. | No |
| `AUTH_SECRET` | Secret key for session security. Generate one using `bunx auth secret`. | Yes |
| `AUTH_GITHUB_ID` | GitHub OAuth client ID. | No |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret. | No |
| `NEXT_PUBLIC_BASE_URL` | Your site's primary URL for RSS and SEO links. | Yes |

## Available Scripts

- `bun run dev`: Start the local development server.
- `bun run build`: Build the app for production.
- `bun run start`: Run the production server.
- `bun run migrate`: Run database migrations.
- `bun test`: Execute the test suite.

## Docker

Run the entire stack using Docker Compose.

```bash
docker-compose up --build
```

This command builds the container and starts the blog. Data is saved in a volume called `blog_data`.

## Project Structure

- `src/app`: Page routes and layouts.
- `src/components`: UI components and building blocks.
- `src/lib`: Database schemas, auth config, and helpers.
- `src/hooks`: Custom React hooks.
- `data`: Storage for the SQLite database file.
- `public`: Static files and images.

## Routes

### Public
- `/`: Home page with post list
- `/posts/[slug]`: Detailed blog post view
- `/search`: Site-wide search
- `/feed.xml`: RSS 2.0 feed
- `/api/health`: Health check endpoint

### User
- `/auth/login`: Login page
- `/auth/register`: Signup page
- `/notifications`: Personal notification feed
- `/history`: Comment history
- `/settings`: Profile and account settings

### Admin
- `/admin`: Main dashboard
- `/admin/posts`: Post management
- `/admin/tags`: Tag management
- `/admin/comments`: Comment moderation
- `/admin/users`: User management

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you want to change.
