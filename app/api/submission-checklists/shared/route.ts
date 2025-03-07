import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  saveSubmissionChecklistConfig, 
  listSharedSubmissionChecklistConfigs,
  SubmissionChecklistConfig
} from '@/utils/submission-checklist-service';

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all shared configurations
    const configs = await listSharedSubmissionChecklistConfigs();

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching shared submission checklist configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared submission checklist configurations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    
    // Create a new ID if not provided
    const configId = body.id;
    
    // Create new configuration or update existing one as shared
    const config: Omit<SubmissionChecklistConfig, 'updatedAt'> = {
      id: configId,
      name: body.name || 'Untitled Shared Checklist',
      description: body.description || '',
      items: body.items || [],
      userEmail: session.user.email,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      isShared: true, // Force it to be shared
    };
    
    // Save the configuration
    const savedConfig = await saveSubmissionChecklistConfig(config, session.user.email);
    
    return NextResponse.json(savedConfig);
  } catch (error) {
    console.error('Error saving shared submission checklist configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save shared submission checklist configuration' },
      { status: 500 }
    );
  }
} 