# Code Structure Documentation

This document provides an overview of the Document Information Extractor and Builder project's code structure and the purpose of key files and directories.

## Root Directory Structure

```
.
├── app/                  # Next.js application routes and pages
│   ├── document-builder/ # Document Builder feature
│   ├── files/            # Files management feature
│   ├── field-prompt/     # Field-Prompt Manager feature
│   ├── chat-with-docs/   # Chat with Docs feature
│   ├── submission-checklist/       # Submission Checklist feature
│   ├── submission-checklist-config/ # Submission Checklist Config Manager
│   ├── compliance-checklist/       # Compliance Checklist feature
│   ├── compliance-checklist-config/ # Compliance Checklist Config Manager
│   └── api/              # API routes including auth, chat, and query endpoints
├── components/           # Reusable React components
│   ├── ui/               # Shared UI components
│   ├── document-builder/ # Document Builder specific components
│   ├── files/            # Files management components
│   ├── field-prompt/     # Field-Prompt Manager components
│   ├── chat/             # Chat with Docs components
│   ├── submission-checklist.tsx    # Submission Checklist component
│   ├── submission-checklist-config.tsx # Submission Checklist Config Manager component
│   ├── compliance-checklist.tsx    # Compliance Checklist component
│   ├── compliance-checklist-config.tsx # Compliance Checklist Config Manager component
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
- Loads both personal and shared field-prompt configurations

### `/app/files`
- Files management page
- File upload, listing, and deletion functionality
- File metadata management

### `/app/field-prompt`
- Field-Prompt Manager page
- Interface for creating, editing, and saving field-prompt configurations
- JSON editor for direct configuration editing
- Support for shared configurations across all users

### `/app/chat-with-docs`
- Chat with Docs interface
- Document selection for chat context
- Chat history management
- Integration with the query API

### `/app/submission-checklist` and `/app/submission-checklist-config`
- Submission checklist interface for document requirement verification
- Configuration management for submission requirements
- Document association with checklist items
- AI-powered assessment of document compliance

### `/app/compliance-checklist` and `/app/compliance-checklist-config`
- Compliance checklist interface for regulatory compliance assessment
- Implements the GSPR Compliance Matrix for medical devices
- AI-powered compliance evaluation of selected documents
- Configuration management for compliance requirements and standards

### `/app/api`
- `/api/auth` - Authentication endpoints
- `/api/chat` - Chat processing endpoints
- `/api/query` - Query API for OpenRouter integration
  - Handles document processing and information extraction
- `/api/field-prompts` - Field-prompt configuration management
  - `/api/field-prompts/shared` - Shared field-prompt configuration endpoints
- `/api/files` - File management endpoints
  - `/api/files/content` - Document content retrieval with improved error handling
- `/api/submission-checklists` - Submission checklist configuration management
- `/api/compliance-checklists` - Compliance checklist configuration management
  - Supports storing configurations in Vercel Blob Storage

## Key Component Directories

### `/components/ui`
- Shared UI components used across features
- Styled according to design specifications
- Implements the left navigation sidebar

### `/components/document-builder` and `/components/document-builder.tsx`
- Components specific to the Document Builder feature
- Field-prompt extraction interface components
- Document selection and display components
- Extraction result display and editing components
- Integration with both personal and shared field-prompt configurations

### `/components/files` and `/components/files.tsx`
- File upload components
- File listing and management components
- File metadata editing components

### `/components/field-prompt` and `/components/field-prompt-manager.tsx`
- Field-prompt editor components
- Configuration save/load functionality
- JSON editor integration
- Shared configuration management interface

### `/components/chat` and `/components/chat.tsx`
- Chat interface components
- Document selection components
- Message display and input components
- Robust document content fetching

### `/components/submission-checklist.tsx` and `/components/submission-checklist-config.tsx`
- Submission checklist item display and management
- Document association interface
- Assessment results display
- Configuration editor with form and JSON views

### `/components/compliance-checklist.tsx` and `/components/compliance-checklist-config.tsx`
- GSPR Compliance Matrix implementation
- Document selection for compliance assessment
- Robust API response parsing with multi-tiered fallback strategies
- Detailed display of compliance status, locations, and explanations
- Configuration management for compliance requirements
- Support for both form-based and JSON editing of configurations
- Sharing capabilities for compliance matrices

## Key Utilities

### Field-Prompt Service (`utils/field-prompt-service.ts`)
- Handles storage and retrieval of field-prompt configurations
- Manages both personal and shared configurations
- Uses Vercel Blob for storage
- Includes functions for:
  - Saving configurations (personal or shared)
  - Listing all configurations (including shared ones)
  - Retrieving specific configurations
  - Deleting configurations

### File Service (`utils/file-service.ts`)
- Manages file storage in Vercel Blob
- Provides file metadata management
- Supports secure file access 

### PDF Handling (`utils/pdf.ts`)
- Utilities for extracting text content from PDF files
- Used by the content API for document processing

### Submission Checklist Service (`utils/submission-checklist-service.ts`)
- Manages submission checklist configurations
- Handles document associations and assessment results

### Compliance Checklist Service (`utils/compliance-checklist-service.ts`)
- Manages compliance checklist configurations in Vercel Blob Storage
- Supports personal and shared compliance matrices
- Provides functions for:
  - Saving configurations with sharing options
  - Listing available configurations (personal and shared)
  - Retrieving specific configurations
  - Updating existing configurations
  - Deleting configurations

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
   - `isShared` (boolean flag for shared configurations)

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

6. `ComplianceChecklist` table:
   - `id` (primary key)
   - `name`
   - `config` (JSON containing checklist items)
   - `createdAt`
   - `updatedAt`
   - `createdBy` (references User.email)
   - `isShared` (boolean flag for shared configurations)
   - `version` (version tracking for audit purposes)

## Key Integration Points

### LLM Integration for Compliance Assessment
- Uses OpenRouter API to access Gemini models
- Implements robust parsing strategies for various response formats:
  - Direct JSON parsing
  - Regex-based JSON extraction
  - Text-based compliance determination
- Fallback mechanisms ensure users always receive meaningful results

### Vercel Blob Storage for Configuration Management
- Stores compliance configurations in organized paths:
  - Personal configurations: `compliance-checklists/{userEmail}/{configId}.json`
  - Shared configurations: `compliance-checklists/shared/{configId}.json`
- Supports configuration versioning and sharing

### API Design
- Modular API endpoints for each feature
- Consistent authentication and error handling
- Support for personal and shared resources

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

