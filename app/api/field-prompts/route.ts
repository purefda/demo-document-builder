import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  listFieldPromptConfigs, 
  saveFieldPromptConfig, 
  FieldPromptConfig 
} from '@/utils/field-prompt-service';

// GET /api/field-prompts - Get all field-prompt configurations for the current user
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to view field-prompt configurations' },
        { status: 401 }
      );
    }

    // Get all configurations for the user
    const configs = await listFieldPromptConfigs(session.user.email);
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching field-prompt configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field-prompt configurations' },
      { status: 500 }
    );
  }
}

// POST /api/field-prompts - Create or update a field-prompt configuration
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to save field-prompt configurations' },
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
    
    // Prepare the configuration object
    const config: Omit<FieldPromptConfig, 'updatedAt'> = {
      id: data.id,
      name: data.name,
      fields: data.fields,
      userEmail: session.user.email,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };
    
    // Save the configuration
    const savedConfig = await saveFieldPromptConfig(config, session.user.email);
    return NextResponse.json(savedConfig);
  } catch (error) {
    console.error('Error saving field-prompt config:', error);
    return NextResponse.json(
      { error: 'Failed to save field-prompt configuration' },
      { status: 500 }
    );
  }
} 