# Code Structure Documentation

This document provides an overview of the Document Information Extractor and Builder project's code structure and the purpose of key files and directories.

## Root Directory Structure

```
.
├── app/                  # Next.js application routes and pages
│   ├── document-builder/ # Document Builder feature
│   ├── files/            # Files management feature
│   ├── field-prompt/     # Field-Prompt Manager feature
│   ├── chat/             # Chat with Docs feature
│   └── api/              # API routes including auth, chat, and query endpoints
├── components/           # Reusable React components
│   ├── ui/               # Shared UI components
│   ├── document-builder/ # Document Builder specific components
│   ├── files/            # Files management components
│   ├── field-prompt/     # Field-Prompt Manager components
│   └── chat/             # Chat with Docs components
├── utils/                # Utility functions and helpers
├── ai/                   # AI-related functionality and query processing
├── public/               # Static assets
├── tests/                # Test files
├── drizzle/              # Database migration files
└── various config files
```

## Key Feature Directories

### `/app/document-builder`
- Main Document Builder page and functionality
- Allows users to select uploaded documents
- Implements the field-prompt extraction interface
- Connects to the query API for information extraction

### `/app/files`
- Files management page
- File upload, listing, and deletion functionality
- File metadata management

### `/app/field-prompt`
- Field-Prompt Manager page
- Interface for creating, editing, and saving field-prompt configurations
- JSON editor for direct configuration editing

### `/app/chat`
- Chat with Docs interface
- Document selection for chat context
- Chat history management
- Integration with the query API

### `/app/api`
- `/api/auth` - Authentication endpoints
- `/api/chat` - Chat processing endpoints
- `/api/query` - Query API for OpenRouter integration
  - Handles document processing and information extraction

## Key Component Directories

### `/components/ui`
- Shared UI components used across features
- Styled according to design specifications
- Implements the left navigation sidebar

### `/components/document-builder`
- Components specific to the Document Builder feature
- Field-prompt extraction interface components
- Document selection and display components
- Extraction result display and editing components

### `/components/files`
- File upload components
- File listing and management components
- File metadata editing components

### `/components/field-prompt`
- Field-prompt editor components
- Configuration save/load functionality
- JSON editor integration

### `/components/chat`
- Chat interface components
- Document selection components
- Message display and input components

## Database Schema

The database schema includes:

1. `User` table:
   - `email` (primary key)
   - `password`

2. `Document` table:
   - `id` (primary key)
   - `fileName`
   - `filePath`
   - `fileSize`
   - `uploadedAt`
   - `uploadedBy` (references User.email)

3. `FieldPromptConfig` table:
   - `id` (primary key)
   - `name`
   - `config` (JSON)
   - `createdAt`
   - `updatedAt`
   - `createdBy` (references User.email)

4. `Chunk` table:
   - `id` (primary key)
   - `documentId` (references Document.id)
   - `content`
   - `embedding`

5. `Chat` table:
   - `id` (primary key)
   - `createdAt`
   - `messages` (JSON)
   - `documentIds` (array of Document.id)
   - `author` (references User.email)

## Key Integrations

### OpenRouter Integration
- Configuration in `utils/openrouter.ts`
- Default model: google/gemini-2.0-flash-001:online
- Used for document information extraction and chat functionality

### Supabase Integration
- Configuration in `utils/supabase.ts`
- Used for database and storage
- Uses environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_DB_URL`

### Vercel Analytics Integration
- Added for usage tracking and performance monitoring
- Integrated into the root layout component (`app/layout.tsx`)
- Provides insights into user behavior and application performance
- No additional configuration required beyond package installation

### Database ORM
- Uses Drizzle ORM for database operations
- Configuration in `drizzle.config.ts`
- Schema defined in `schema.ts`

### Authentication
- Uses NextAuth.js for authentication
- Configuration integrated with Supabase

## Design Implementation

1. **Styling**
   - Uses Tailwind CSS with custom theme
   - Color palette:
     - Purple: #2f59cf
     - Deep Purple: #00185c
     - Light White: #f6f8fd
   - Font configuration:
     - Titles: Fraktion Sans Variable
     - Text: Soehne

2. **Layout**
   - Left navigation sidebar always visible
   - Main content area for each feature
   - Responsive design for various screen sizes

## Environment Variables

Key environment variables required:
- `OPENAI_API_KEY` - For AI functionality
- `AUTH_SECRET` - For authentication
- `BLOB_READ_WRITE_TOKEN` - For blob storage
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_DB_URL` - Supabase database connection string
- `OPENROUTER_API_KEY` - For access to OpenRouter AI models 