# Document Information Extractor and Builder

This application provides a powerful tool for extracting structured information from documents using AI. It's particularly focused on processing medical device Instructions for Use (IFU) documents, allowing users to define custom fields and prompts to extract specific information.

## Key Features

- **Document Builder**: Extract structured information from uploaded documents using customizable field-prompt pairs
- **Files Management**: Upload, organize, and manage your document library
- **Field-Prompt Manager**: Create, edit, and save configurations of field-prompt pairs
- **Chat with Docs**: Interactive chat interface to query information from your documents
- **Analytics**: Integrated with Vercel Analytics for usage tracking and performance monitoring

To run the example locally you need to:

1. Sign up for an OpenRouter account to access AI models, particularly google/gemini-2.0-flash-001.
2. Create a Supabase account for database and storage functionality.
3. Set the required environment variables as shown in the `.env.example` file in a new `.env` file.
4. `npm install` to install the required dependencies.
5. `npm run dev` to launch the development server.

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY` - For AI functionality
- `AUTH_SECRET` - For authentication
- `BLOB_READ_WRITE_TOKEN` - For blob storage
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_DB_URL` - Supabase database connection string

## Design Specifications

The application follows these design specifications:
- **Colors**: Purple (#2f59cf), Deep Purple (#00185c), Light White (#f6f8fd)
- **Fonts**: Fraktion Sans Variable (titles), Soehne (text)
- **Navigation**: Left sidebar with links to Document Builder, Files Page, Field-Prompt Manager, and Chat with Docs

## Learn More

To learn more about the technologies used in this project:

- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
