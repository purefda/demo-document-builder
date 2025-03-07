import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ComplianceChecklistService } from '@/utils/compliance-checklist-service';

// GET /api/compliance-checklists/[id] - Get a specific compliance checklist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    // First try to get it from user's personal configs
    let checklist = await ComplianceChecklistService.getConfig(id, session.user.email, false);
    
    // If not found, try shared configs
    if (!checklist) {
      checklist = await ComplianceChecklistService.getConfig(id, session.user.email, true);
    }

    if (!checklist) {
      return NextResponse.json({ error: 'Compliance checklist not found' }, { status: 404 });
    }

    return NextResponse.json({ checklist }, { status: 200 });
  } catch (error) {
    console.error('Error fetching compliance checklist:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance checklist' }, { status: 500 });
  }
}

// PUT /api/compliance-checklists/[id] - Update a specific compliance checklist
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const body = await request.json();
    const { name, config, isShared } = body;

    if (!name || !config) {
      return NextResponse.json({ error: 'Name and config are required' }, { status: 400 });
    }

    // Check if the checklist exists and is owned by the user
    const existingChecklist = await ComplianceChecklistService.getConfig(id, session.user.email, false);
    
    if (!existingChecklist) {
      return NextResponse.json({ error: 'Compliance checklist not found or you do not have permission to update it' }, { status: 404 });
    }

    const updatedChecklist = await ComplianceChecklistService.updateConfig(
      {
        ...existingChecklist,
        name,
        config,
        isShared: isShared !== undefined ? isShared : existingChecklist.isShared
      },
      session.user.email,
      isShared !== undefined ? isShared : existingChecklist.isShared
    );

    return NextResponse.json({ checklist: updatedChecklist }, { status: 200 });
  } catch (error) {
    console.error('Error updating compliance checklist:', error);
    return NextResponse.json({ error: 'Failed to update compliance checklist' }, { status: 500 });
  }
}

// DELETE /api/compliance-checklists/[id] - Delete a specific compliance checklist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    // Check if the checklist exists and is owned by the user
    const existingChecklist = await ComplianceChecklistService.getConfig(id, session.user.email, false);
    
    if (!existingChecklist) {
      return NextResponse.json({ error: 'Compliance checklist not found or you do not have permission to delete it' }, { status: 404 });
    }

    const success = await ComplianceChecklistService.deleteConfig(id, session.user.email, false);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete compliance checklist' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Compliance checklist deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting compliance checklist:', error);
    return NextResponse.json({ error: 'Failed to delete compliance checklist' }, { status: 500 });
  }
} 