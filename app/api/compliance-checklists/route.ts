import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ComplianceChecklistService } from '@/utils/compliance-checklist-service';

// GET /api/compliance-checklists - Get all compliance checklists
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const shared = searchParams.get('shared') === 'true';

    const checklists = await ComplianceChecklistService.listConfigs(session.user.email, shared);

    return NextResponse.json({ checklists }, { status: 200 });
  } catch (error) {
    console.error('Error fetching compliance checklists:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance checklists' }, { status: 500 });
  }
}

// POST /api/compliance-checklists - Create a new compliance checklist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, config, isShared } = body;

    if (!name || !config) {
      return NextResponse.json({ error: 'Name and config are required' }, { status: 400 });
    }

    const checklist = await ComplianceChecklistService.saveConfig(
      {
        name,
        config,
        isShared: isShared || false,
        version: "1.0"
      },
      session.user.email,
      isShared || false
    );

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error) {
    console.error('Error creating compliance checklist:', error);
    return NextResponse.json({ error: 'Failed to create compliance checklist' }, { status: 500 });
  }
} 