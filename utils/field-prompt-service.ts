import { put, list, del, head } from '@vercel/blob';

export interface FieldPrompt {
  key: string;
  prompt: string;
}

export interface FieldPromptConfig {
  id: string;
  name: string;
  fields: FieldPrompt[];
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save a field-prompt configuration to Vercel Blob Storage
 */
export async function saveFieldPromptConfig(
  config: Omit<FieldPromptConfig, 'updatedAt'>, 
  userEmail: string
): Promise<FieldPromptConfig> {
  const configToSave = {
    ...config,
    userEmail,
    updatedAt: new Date()
  };

  // Store the configuration as a JSON file
  const configBlob = new Blob([JSON.stringify(configToSave)], { type: 'application/json' });
  const file = new File([configBlob], `${configToSave.id}.json`, { type: 'application/json' });
  
  await put(`field-prompts/${userEmail}/${configToSave.id}.json`, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return configToSave;
}

/**
 * List all field-prompt configurations for a user
 */
export async function listFieldPromptConfigs(userEmail: string): Promise<FieldPromptConfig[]> {
  try {
    const { blobs } = await list({ prefix: `field-prompts/${userEmail}/` });
    
    if (!blobs.length) {
      return [];
    }

    const configs: FieldPromptConfig[] = [];
    
    for (const blob of blobs) {
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
    console.error('Error listing field-prompt configs:', error);
    return [];
  }
}

/**
 * Get a specific field-prompt configuration by ID
 */
export async function getFieldPromptConfig(configId: string, userEmail: string): Promise<FieldPromptConfig | null> {
  try {
    const { blobs } = await list({ prefix: `field-prompts/${userEmail}/${configId}.json` });
    
    if (!blobs.length) {
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting field-prompt config ${configId}:`, error);
    return null;
  }
}

/**
 * Delete a field-prompt configuration
 */
export async function deleteFieldPromptConfig(configId: string, userEmail: string): Promise<boolean> {
  try {
    const { blobs } = await list({ prefix: `field-prompts/${userEmail}/${configId}.json` });
    
    if (!blobs.length) {
      return false;
    }
    
    await del(blobs[0].url);
    return true;
  } catch (error) {
    console.error(`Error deleting field-prompt config ${configId}:`, error);
    return false;
  }
} 