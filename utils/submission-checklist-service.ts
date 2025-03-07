import { put, list, del } from '@vercel/blob';

export interface ChecklistItem {
  id: string;
  name: string;
  requirement: string;
  documents: string[]; // Document URLs or paths
  status: 'compliant' | 'non-compliant' | 'needs-review' | 'not-checked';
  comments: string;
}

export interface SubmissionChecklistConfig {
  id: string;
  name: string;
  description: string;
  items: ChecklistItem[];
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
  isShared?: boolean; // Flag to indicate shared configuration
}

// Constant for shared configurations storage path
export const SHARED_CONFIG_PATH = 'submission-checklists/shared';

/**
 * Save a submission checklist configuration to Vercel Blob Storage
 */
export async function saveSubmissionChecklistConfig(
  config: Omit<SubmissionChecklistConfig, 'updatedAt'>, 
  userEmail: string
): Promise<SubmissionChecklistConfig> {
  const configToSave = {
    ...config,
    userEmail,
    updatedAt: new Date()
  };

  // Determine the storage path based on whether it's shared or not
  const storagePath = configToSave.isShared 
    ? `${SHARED_CONFIG_PATH}/${configToSave.id}.json` 
    : `submission-checklists/${userEmail}/${configToSave.id}.json`;

  // Store the configuration as a JSON file
  const configBlob = new Blob([JSON.stringify(configToSave)], { type: 'application/json' });
  const file = new File([configBlob], `${configToSave.id}.json`, { type: 'application/json' });
  
  await put(storagePath, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return configToSave;
}

/**
 * List all submission checklist configurations for a user, including shared ones
 */
export async function listSubmissionChecklistConfigs(userEmail: string): Promise<SubmissionChecklistConfig[]> {
  try {
    // Get user-specific configurations
    const { blobs: userBlobs } = await list({ prefix: `submission-checklists/${userEmail}/` });
    
    // Get shared configurations
    const { blobs: sharedBlobs } = await list({ prefix: `${SHARED_CONFIG_PATH}/` });
    
    const allBlobs = [...userBlobs, ...sharedBlobs];
    
    if (!allBlobs.length) {
      return [];
    }

    const configs: SubmissionChecklistConfig[] = [];
    
    for (const blob of allBlobs) {
      try {
        const response = await fetch(blob.url);
        if (!response.ok) continue;
        
        const config = await response.json();
        configs.push(config);
      } catch (error) {
        console.error(`Error fetching config ${blob.url}:`, error);
      }
    }
    
    return configs;
  } catch (error) {
    console.error('Error listing submission checklist configs:', error);
    return [];
  }
}

/**
 * Get a specific submission checklist configuration by ID
 */
export async function getSubmissionChecklistConfig(configId: string, userEmail: string): Promise<SubmissionChecklistConfig | null> {
  try {
    // Try to get user-specific config first
    let { blobs } = await list({ prefix: `submission-checklists/${userEmail}/${configId}.json` });
    
    // If not found, try shared configs
    if (!blobs.length) {
      blobs = (await list({ prefix: `${SHARED_CONFIG_PATH}/${configId}.json` })).blobs;
    }
    
    if (!blobs.length) {
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting submission checklist config ${configId}:`, error);
    return null;
  }
}

/**
 * Delete a submission checklist configuration
 */
export async function deleteSubmissionChecklistConfig(configId: string, userEmail: string): Promise<boolean> {
  try {
    // Try to find the config in user-specific storage
    let { blobs } = await list({ prefix: `submission-checklists/${userEmail}/${configId}.json` });
    
    // If not found there, try shared storage (only admins should be able to delete shared configs)
    if (!blobs.length) {
      blobs = (await list({ prefix: `${SHARED_CONFIG_PATH}/${configId}.json` })).blobs;
    }
    
    if (!blobs.length) {
      return false;
    }
    
    await del(blobs[0].url);
    return true;
  } catch (error) {
    console.error(`Error deleting submission checklist config ${configId}:`, error);
    return false;
  }
}

/**
 * List all shared submission checklist configurations
 */
export async function listSharedSubmissionChecklistConfigs(): Promise<SubmissionChecklistConfig[]> {
  try {
    // Get shared configurations
    const { blobs: sharedBlobs } = await list({ prefix: `${SHARED_CONFIG_PATH}/` });
    
    if (!sharedBlobs.length) {
      return [];
    }

    const configs: SubmissionChecklistConfig[] = [];
    
    for (const blob of sharedBlobs) {
      try {
        const response = await fetch(blob.url);
        if (!response.ok) continue;
        
        const config = await response.json();
        configs.push(config);
      } catch (error) {
        console.error(`Error fetching shared config ${blob.url}:`, error);
      }
    }
    
    return configs;
  } catch (error) {
    console.error('Error listing shared submission checklist configs:', error);
    return [];
  }
}

/**
 * Assess documents against a checklist item using AI
 * This is a simplified version that doesn't make API calls directly.
 * The actual API call should be made from the client component.
 */
export async function assessDocumentCompliance(
  checklistItem: ChecklistItem,
  documentContents: Record<string, string>,
): Promise<{ status: ChecklistItem['status']; comments: string }> {
  try {
    // Check if we have document content
    if (Object.keys(documentContents).length === 0) {
      return {
        status: 'needs-review',
        comments: 'No document content provided for assessment.',
      };
    }

    // Simple direct assessment using keyword matching
    const combinedContent = Object.values(documentContents).join('\n\n');
    const lowerContent = combinedContent.toLowerCase();
    const lowerRequirement = checklistItem.requirement.toLowerCase();
    
    // Extract key terms (words longer than 3 chars)
    const requirementTerms = lowerRequirement.split(/\s+/).filter(term => term.length > 3);
    let matchCount = 0;
    
    // Count matches
    for (const term of requirementTerms) {
      if (lowerContent.includes(term)) {
        matchCount++;
      }
    }
    
    // Set status based on match percentage
    let status: ChecklistItem['status'] = 'needs-review';
    let assessmentText = '';
    
    if (requirementTerms.length > 0) {
      const matchPercentage = matchCount / requirementTerms.length;
      
      if (matchPercentage >= 0.7) {
        status = 'compliant';
        assessmentText = `Assessment: compliant
Explanation: Document appears to address the requirement for "${checklistItem.requirement}". Key terms from the requirement were found in the content.`;
      } else if (matchPercentage >= 0.3) {
        status = 'needs-review';
        assessmentText = `Assessment: needs-review
Explanation: Document partially addresses the requirement for "${checklistItem.requirement}". Some relevant terms were found, but further review is needed.`;
      } else {
        status = 'non-compliant';
        assessmentText = `Assessment: non-compliant
Explanation: Document appears to lack coverage of the requirement for "${checklistItem.requirement}". Few or no key terms were found.`;
      }
    } else {
      assessmentText = `Assessment: needs-review
Explanation: Unable to analyze the requirement "${checklistItem.requirement}" due to insufficient key terms.`;
    }
    
    return {
      status,
      comments: assessmentText
    };
  } catch (error) {
    console.error('Error assessing document compliance:', error);
    return {
      status: 'needs-review',
      comments: `Error assessing compliance: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
} 