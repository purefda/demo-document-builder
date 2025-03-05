# Code Structure Documentation

This document provides an overview of the project's code structure and the purpose of key files and directories.

## Root Directory Structure

```
.
├── app/                  # Next.js application routes and pages
├── components/          # Reusable React components
├── utils/              # Utility functions and helpers
├── ai/                 # AI-related functionality
├── public/             # Static assets
├── tests/              # Test files
├── drizzle/            # Database migration files
└── various config files
```

## Key Directories

### `/app`
- Next.js 13+ app directory containing routes and pages
- Uses the new App Router for routing
- Contains page components and layouts

### `/components`
- Reusable React components
- Shared UI elements used across different pages

### `/utils`
- Utility functions and shared logic
- Contains `supabase.ts` - Supabase client configuration and initialization
- Helper functions and common code

### `/ai`
- AI-related functionality and integrations
- OpenAI and other AI service integrations

### `/tests`
- Test files and testing utilities
- Contains `test-db-connection.ts` for database connection testing

### `/drizzle`
- Database migration files
- Generated SQL and migration history

## Key Files

### Database Configuration
- `schema.ts` - Database schema definitions using Drizzle ORM
- `drizzle.config.ts` - Drizzle ORM configuration
- `migrate.ts` - Database migration utility

### Configuration Files
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `postcss.config.mjs` - PostCSS configuration
- `middleware.ts` - Next.js middleware configuration

### Environment and Dependencies
- `.env.example` - Example environment variables template
- `.env.local` - Local environment variables (not in git)
- `package.json` - Project dependencies and scripts

## Database Schema

The database schema (defined in `schema.ts`) includes:

1. `User` table:
   - `email` (primary key)
   - `password`

2. `Chat` table:
   - `id` (primary key)
   - `createdAt`
   - `messages`
   - `author` (references User.email)

3. `Chunk` table:
   - `id` (primary key)
   - `filePath`
   - `content`
   - `embedding`

## Key Integrations

### Supabase Integration
- Configuration in `utils/supabase.ts`
- Uses environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_DB_URL`

### Database ORM
- Uses Drizzle ORM for database operations
- Configuration in `drizzle.config.ts`
- Schema defined in `schema.ts`

### Authentication
- Uses NextAuth.js for authentication
- Configuration integrated with Supabase

## Development Tools

1. **Package Manager**
   - Uses pnpm for dependency management

2. **TypeScript**
   - Strict type checking enabled
   - Configuration in `tsconfig.json`

3. **Testing**
   - Test files located in `/tests`
   - Includes database connection testing

4. **Styling**
   - Uses Tailwind CSS
   - Configuration in `tailwind.config.ts`

## Environment Variables

Key environment variables required:
- `OPENAI_API_KEY` - For AI functionality
- `AUTH_SECRET` - For authentication
- `BLOB_READ_WRITE_TOKEN` - For blob storage
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_DB_URL` - Supabase database connection string 