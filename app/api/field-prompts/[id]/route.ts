import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  deleteFieldPromptConfig, 
  getFieldPromptConfig
} from '@/utils/field-prompt-service';

// DELETE /api/field-prompts/[id] - Delete a specific field-prompt configuration
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to delete field-prompt configurations' },
        { status: 401 }
      );
    }
    
    // Get the config to verify ownership
    const config = await getFieldPromptConfig(id, session.user.email);
    
    // Check if config exists and belongs to the user
    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Delete the configuration
    const success = await deleteFieldPromptConfig(id, session.user.email);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting field-prompt config:', error);
    return NextResponse.json(
      { error: 'Failed to delete field-prompt configuration' },
      { status: 500 }
    );
  }
}

// GET /api/field-prompts/[id] - Get a specific field-prompt configuration
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to view field-prompt configurations' },
        { status: 401 }
      );
    }
    
    // Get the configuration
    const config = await getFieldPromptConfig(id, session.user.email);
    
    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching field-prompt config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field-prompt configuration' },
      { status: 500 }
    );
  }
} 