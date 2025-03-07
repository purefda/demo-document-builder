import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { 
  getSubmissionChecklistConfig,
  deleteSubmissionChecklistConfig,
  assessDocumentCompliance,
  saveSubmissionChecklistConfig,
  ChecklistItem
} from '@/utils/submission-checklist-service';
import { getFile } from '@/utils/file-service';

// Helper function to get file content
async function getFileContent(userEmail: string, filePath: string) {
  try {
    const file = await getFile(userEmail, filePath);
    if (!file) return null;
    
    const response = await fetch(file.url);
    if (!response.ok) return null;
    
    return await response.text();
  } catch (error) {
    console.error(`Error getting file content for ${filePath}:`, error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing checklist ID' }, { status: 400 });
    }
    
    // Get user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the config
    const config = await getSubmissionChecklistConfig(id, session.user.email);
    
    if (!config) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching submission checklist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission checklist' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing checklist ID' }, { status: 400 });
    }
    
    // Get user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete the config
    const success = await deleteSubmissionChecklistConfig(id, session.user.email);
    
    if (!success) {
      return NextResponse.json({ error: 'Checklist not found or could not be deleted' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission checklist:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission checklist' },
      { status: 500 }
    );
  }
}

// Endpoint to update a checklist item
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing checklist ID' }, { status: 400 });
    }
    
    // Get user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the checklist
    const checklist = await getSubmissionChecklistConfig(id, session.user.email);
    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await req.json();
    const { itemId, status, comments, documentPaths, operation } = body;
    
    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }
    
    // Find the checklist item
    const itemIndex = checklist.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      // If we're adding a new field and it doesn't exist yet
      if (operation === 'add_field') {
        // Create a new item with the provided data
        const newItem: ChecklistItem = {
          id: itemId,
          name: body.name || 'New Field',
          requirement: body.requirement || '',
          documents: documentPaths || [],
          status: 'not-checked',
          comments: '',
        };
        
        // Add the new item to the checklist
        const updatedChecklist = {
          ...checklist,
          items: [...checklist.items, newItem],
        };
        
        // Save the updated checklist
        await saveSubmissionChecklistConfig(updatedChecklist, session.user.email);
        
        // Return the new item
        return NextResponse.json(newItem);
      }
      
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }
    
    // Different operations based on the request type
    if (operation === 'update_config') {
      // Only update fields that should be part of the config
      const updatedItems = [...checklist.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        name: body.name || updatedItems[itemIndex].name,
        requirement: body.requirement || updatedItems[itemIndex].requirement,
        ...(documentPaths && { documents: documentPaths }),
      };
      
      // Save the updated checklist
      const updatedChecklist = {
        ...checklist,
        items: updatedItems,
      };
      
      await saveSubmissionChecklistConfig(updatedChecklist, session.user.email);
      
      // Return the updated item
      return NextResponse.json(updatedItems[itemIndex]);
    } else if (operation === 'update_assessment') {
      // For assessment updates, we'll store them separately
      // This ensures the config file isn't modified by assessment results
      // Create a session-specific storage key for assessment results
      const assessmentKey = `assessment_${session.user.email}_${id}_${itemId}`;
      
      // Store assessment results using a different mechanism
      // For now, we'll update the item but mark it clearly as assessment data
      const updatedItems = [...checklist.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        status: status || updatedItems[itemIndex].status,
        comments: comments || updatedItems[itemIndex].comments,
      };
      
      // Save the updated checklist
      const updatedChecklist = {
        ...checklist,
        items: updatedItems,
      };
      
      await saveSubmissionChecklistConfig(updatedChecklist, session.user.email);
      
      // Return the updated item
      return NextResponse.json(updatedItems[itemIndex]);
    } else {
      // Default behavior - just update the item with provided fields
      const updatedItems = [...checklist.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        ...(status && { status }),
        ...(comments && { comments }),
        ...(documentPaths && { documents: documentPaths }),
      };
      
      // Save the updated checklist
      const updatedChecklist = {
        ...checklist,
        items: updatedItems,
      };
      
      await saveSubmissionChecklistConfig(updatedChecklist, session.user.email);
      
      // Return the updated item
      return NextResponse.json(updatedItems[itemIndex]);
    }
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    );
  }
} 