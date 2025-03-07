import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { v4 as uuid } from 'uuid';
import { 
  saveSubmissionChecklistConfig, 
  listSubmissionChecklistConfigs,
  SubmissionChecklistConfig
} from '@/utils/submission-checklist-service';

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all configurations for this user
    const configs = await listSubmissionChecklistConfigs(session.user.email);

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching submission checklist configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission checklist configurations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    
    // Create a new ID if not provided
    const configId = body.id || uuid();
    
    // Create new configuration or update existing one
    const config: Omit<SubmissionChecklistConfig, 'updatedAt'> = {
      id: configId,
      name: body.name || 'Untitled Checklist',
      description: body.description || '',
      items: body.items || [],
      userEmail: session.user.email,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      isShared: body.isShared || false,
    };
    
    // Save the configuration
    const savedConfig = await saveSubmissionChecklistConfig(config, session.user.email);
    
    return NextResponse.json(savedConfig);
  } catch (error) {
    console.error('Error saving submission checklist configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save submission checklist configuration' },
      { status: 500 }
    );
  }
} 