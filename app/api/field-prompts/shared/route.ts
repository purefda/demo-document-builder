import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  listSharedFieldPromptConfigs,
  saveFieldPromptConfig, 
  FieldPromptConfig 
} from '@/utils/field-prompt-service';

// GET /api/field-prompts/shared - Get all shared field-prompt configurations
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to view shared field-prompt configurations' },
        { status: 401 }
      );
    }

    // Get all shared configurations
    const configs = await listSharedFieldPromptConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching shared field-prompt configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared field-prompt configurations' },
      { status: 500 }
    );
  }
}

// POST /api/field-prompts/shared - Create or update a shared field-prompt configuration
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to save shared field-prompt configurations' },
        { status: 401 }
      );
    }
    
    // Get the configuration data from the request body
    const data = await req.json();
    
    // Validate the data
    if (!data.id || !data.name || !Array.isArray(data.fields)) {
      return NextResponse.json(
        { error: 'Invalid configuration data' },
        { status: 400 }
      );
    }
    
    // Ensure each field has a key and prompt
    for (const field of data.fields) {
      if (!field.key || !field.prompt) {
        return NextResponse.json(
          { error: 'All fields must have a key and prompt' },
          { status: 400 }
        );
      }
    }
    
    // Prepare the configuration object and force isShared to true
    const config: Omit<FieldPromptConfig, 'updatedAt'> = {
      id: data.id,
      name: data.name,
      fields: data.fields,
      userEmail: session.user.email,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      isShared: true, // Always set to true for this endpoint
    };
    
    // Save the configuration
    const savedConfig = await saveFieldPromptConfig(config, session.user.email);
    return NextResponse.json(savedConfig);
  } catch (error) {
    console.error('Error saving shared field-prompt config:', error);
    return NextResponse.json(
      { error: 'Failed to save shared field-prompt configuration' },
      { status: 500 }
    );
  }
} 